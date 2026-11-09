import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from ml.food_clustering.pipeline import (
    DEFAULT_FEATURES,
    _feature_matrix,
    evaluate_cluster_counts,
    load_and_prepare_dataset,
    predict_food,
    train_model,
)


def _nutrient(nutrient_id: int, name: str, unit: str, amount: float, **extra: float) -> dict:
    return {
        "nutrient": {"id": nutrient_id, "name": name, "unitName": unit},
        "amount": amount,
        **extra,
    }


class FoodClusteringTests(unittest.TestCase):
    def _write_dataset(self, folder: Path) -> Path:
        foods = []
        for index in range(18):
            base = 1.0 if index < 9 else 50.0
            nutrients = [
                _nutrient(2048, "Energy", "kcal", base + (index % 3)),
                _nutrient(1003, "Protein", "g", base / 10 + (index % 2)),
                _nutrient(1004, "Fat", "g", base / 8 + (index % 2)),
                _nutrient(1005, "Carbohydrate", "g", base / 5 + (index % 3)),
                _nutrient(1079, "Fiber", "g", base / 20 + (index % 2)),
            ]
            if index == 0:
                nutrients[2]["amount"] = None
            foods.append({
                "fdcId": 800000 + index,
                "description": f"Source food {index}",
                "foodNutrients": nutrients,
            })
        foods.extend([
            None,
            {"fdcId": 999001, "description": "No nutrient data", "foodNutrients": []},
        ])
        path = folder / "foundation.json"
        path.write_text(json.dumps({"FoundationFoods": foods}), encoding="utf-8")
        return path

    def test_preprocessing_uses_expected_features_and_excludes_malformed_records(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            records, report = load_and_prepare_dataset(self._write_dataset(Path(temp_dir)))

        self.assertEqual(tuple(records[0]["features"]), DEFAULT_FEATURES)
        self.assertEqual(len(records), 18)
        self.assertEqual(report.malformed_record_count, 1)
        self.assertEqual(report.excluded_without_nutrients_count, 1)
        self.assertIsNone(records[0]["features"]["fat_g"])
        self.assertEqual(report.missing_feature_counts["fat_g"], 1)

    def test_nutrient_units_and_below_quantification_values_are_missing(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = self._write_dataset(Path(temp_dir))
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["FoundationFoods"][0]["foodNutrients"][0]["nutrient"]["unitName"] = "kJ"
            payload["FoundationFoods"][1]["foodNutrients"][4]["amount"] = 0
            payload["FoundationFoods"][1]["foodNutrients"][4]["loq"] = 0.2
            path.write_text(json.dumps(payload), encoding="utf-8")
            records, report = load_and_prepare_dataset(path)

        self.assertIsNone(records[0]["features"]["energy_kcal"])
        self.assertIsNone(records[1]["features"]["fiber_g"])
        self.assertEqual(report.missing_feature_counts["energy_kcal"], 1)
        self.assertEqual(report.missing_feature_counts["fiber_g"], 1)

    def test_evaluation_uses_actual_calculated_silhouette_scores(self) -> None:
        matrix = np.asarray([[0.0], [0.1], [0.2], [9.8], [9.9], [10.0]])
        result = evaluate_cluster_counts(matrix, (2, 3))
        scaled = StandardScaler().fit_transform(matrix)
        labels = KMeans(n_clusters=2, random_state=42, n_init=20).fit_predict(scaled)
        independently_calculated = silhouette_score(
            scaled,
            labels,
        )
        self.assertEqual(result[0]["cluster_count"], 2)
        self.assertAlmostEqual(result[0]["silhouette_score"], independently_calculated)

    def test_duplicate_fdc_ids_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = self._write_dataset(Path(temp_dir))
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["FoundationFoods"].append(payload["FoundationFoods"][0])
            path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Duplicate USDA fdcId"):
                load_and_prepare_dataset(path)

    def test_training_is_reproducible_and_prediction_keeps_source_identity(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            dataset = self._write_dataset(temp)
            result = train_model(dataset, temp / "artifacts")
            saved = predict_food(800000, result["model_path"])
            self.assertTrue(result["model_path"].is_file())
            self.assertTrue(result["evaluation_path"].is_file())
            self.assertTrue(result["assignments_path"].is_file())
            self.assertEqual(saved["fdc_id"], 800000)
            self.assertEqual(saved["food_name"], "Source food 0")
            self.assertIsInstance(saved["cluster"], int)

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            dataset = self._write_dataset(temp)
            first = train_model(dataset, temp / "first")
            second = train_model(dataset, temp / "second")
            self.assertEqual(first["evaluation"], second["evaluation"])
            self.assertEqual(first["selected_cluster_count"], second["selected_cluster_count"])
            self.assertEqual(
                predict_food(800000, first["model_path"])["cluster"],
                predict_food(800000, second["model_path"])["cluster"],
            )

    def test_prediction_rejects_food_not_in_model_source(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            result = train_model(self._write_dataset(temp), temp / "artifacts")
            with self.assertRaises(KeyError):
                predict_food(123, result["model_path"])

    def test_feature_matrix_preserves_missing_values_for_imputation(self) -> None:
        record = {"features": {feature: None for feature in DEFAULT_FEATURES}}
        matrix = _feature_matrix([record])
        self.assertEqual(matrix.shape, (1, len(DEFAULT_FEATURES)))
        self.assertTrue(np.isnan(matrix).all())


if __name__ == "__main__":
    unittest.main()
