"""Train and inspect a reproducible K-Means model on USDA Foundation Foods."""

from __future__ import annotations

import argparse
import csv
import json
import math
import warnings
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.impute import SimpleImputer
from sklearn.metrics import silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "usda" / "FoodData_Central_foundation_food_json_2026-04-30.json"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
RANDOM_STATE = 42
FEATURES: dict[str, tuple[tuple[int, ...], str]] = {
    "energy_kcal": ((2048, 2047, 1008), "kcal"),
    "protein_g": ((1003,), "g"),
    "fat_g": ((1004,), "g"),
    "carbohydrate_g": ((1005,), "g"),
    "fiber_g": ((1079, 2033), "g"),
}
DEFAULT_FEATURES = tuple(FEATURES)


@dataclass(frozen=True)
class DatasetReport:
    source_record_count: int
    malformed_record_count: int
    valid_identity_count: int
    excluded_invalid_identity_count: int
    excluded_without_nutrients_count: int
    training_record_count: int
    missing_feature_counts: dict[str, int]
    nutrient_ids_by_feature: dict[str, list[int]]


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _feature_value(food: dict[str, Any], feature_name: str) -> tuple[float | None, int | None]:
    nutrient_ids, expected_unit = FEATURES[feature_name]
    nutrients = food.get("foodNutrients")
    if not isinstance(nutrients, list):
        return None, None

    for nutrient_id in nutrient_ids:
        for item in nutrients:
            if not isinstance(item, dict):
                continue
            nutrient = item.get("nutrient")
            if not isinstance(nutrient, dict):
                nutrient = {}
            item_id = nutrient.get("id")
            if item_id is None:
                item_id = item.get("nutrientId")
            if item_id != nutrient_id:
                continue

            unit = nutrient.get("unitName")
            if not isinstance(unit, str):
                unit = item.get("unitName")
            if not isinstance(unit, str) or unit.strip().lower() != expected_unit:
                continue

            amount = _finite_number(item.get("amount"))
            if amount is None:
                amount = _finite_number(item.get("value"))
            loq = _finite_number(item.get("loq"))
            if loq is None:
                loq = _finite_number(item.get("limitOfQuantification"))
            if amount is None or (amount == 0 and loq is not None and loq > 0):
                continue
            return amount, nutrient_id

    return None, None


def load_and_prepare_dataset(dataset_path: Path = DEFAULT_DATASET) -> tuple[list[dict[str, Any]], DatasetReport]:
    """Parse source records, retain provenance, and represent absent nutrients as NaN."""
    with dataset_path.open("r", encoding="utf-8") as source:
        payload = json.load(source)
    if not isinstance(payload, dict) or not isinstance(payload.get("FoundationFoods"), list):
        raise ValueError("Expected a USDA JSON object containing a FoundationFoods list.")

    raw_records = payload["FoundationFoods"]
    valid_records: list[dict[str, Any]] = []
    malformed_count = 0
    invalid_identity_count = 0
    no_nutrients_count = 0
    missing_counts = {feature: 0 for feature in DEFAULT_FEATURES}
    nutrient_ids_by_feature = {feature: list(FEATURES[feature][0]) for feature in DEFAULT_FEATURES}
    seen_ids: set[int] = set()

    for raw in raw_records:
        if not isinstance(raw, dict):
            malformed_count += 1
            continue

        fdc_id = raw.get("fdcId")
        name = raw.get("description")
        if isinstance(fdc_id, bool) or not isinstance(fdc_id, int) or fdc_id <= 0 or not isinstance(name, str) or not name.strip():
            invalid_identity_count += 1
            continue
        if fdc_id in seen_ids:
            raise ValueError(f"Duplicate USDA fdcId found: {fdc_id}")
        seen_ids.add(fdc_id)

        features: dict[str, float | None] = {}
        nutrient_sources: dict[str, int | None] = {}
        for feature in DEFAULT_FEATURES:
            value, nutrient_id = _feature_value(raw, feature)
            features[feature] = value
            nutrient_sources[feature] = nutrient_id

        if all(value is None for value in features.values()):
            no_nutrients_count += 1
            continue

        for feature, value in features.items():
            if value is None:
                missing_counts[feature] += 1
        valid_records.append({
            "fdc_id": fdc_id,
            "food_name": name.strip(),
            "features": features,
            "nutrient_ids": nutrient_sources,
        })

    if not valid_records:
        raise ValueError("No USDA records with valid identities and nutrient data were found.")

    report = DatasetReport(
        source_record_count=len(raw_records),
        malformed_record_count=malformed_count,
        valid_identity_count=len(seen_ids),
        excluded_invalid_identity_count=invalid_identity_count,
        excluded_without_nutrients_count=no_nutrients_count,
        training_record_count=len(valid_records),
        missing_feature_counts=missing_counts,
        nutrient_ids_by_feature=nutrient_ids_by_feature,
    )
    return valid_records, report


def _feature_matrix(records: list[dict[str, Any]], feature_names: tuple[str, ...] = DEFAULT_FEATURES) -> np.ndarray:
    return np.asarray(
        [
            [
                record["features"].get(feature)
                if record["features"].get(feature) is not None
                else np.nan
                for feature in feature_names
            ]
            for record in records
        ],
        dtype=float,
    )


def _make_pipeline(cluster_count: int) -> Pipeline:
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("kmeans", KMeans(n_clusters=cluster_count, random_state=RANDOM_STATE, n_init=20)),
    ])


def evaluate_cluster_counts(matrix: np.ndarray, cluster_counts: range | tuple[int, ...] = range(2, 9)) -> list[dict[str, float | int]]:
    """Return silhouette scores only for K values with valid, non-degenerate labels."""
    values = np.asarray(matrix, dtype=float)
    if values.ndim != 2 or values.shape[0] < 3 or values.shape[1] < 1:
        raise ValueError("Silhouette evaluation requires at least three rows and one feature.")
    if not np.isfinite(values).any(axis=0).all():
        raise ValueError("Every feature must have at least one observed value.")

    evaluation_matrix = StandardScaler().fit_transform(SimpleImputer(strategy="median").fit_transform(values))
    results: list[dict[str, float | int]] = []
    max_clusters = min(values.shape[0] - 1, max(cluster_counts, default=1))
    for cluster_count in cluster_counts:
        if cluster_count < 2 or cluster_count > max_clusters:
            continue
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            labels = KMeans(n_clusters=cluster_count, random_state=RANDOM_STATE, n_init=20).fit_predict(evaluation_matrix)
        distinct_clusters = len(np.unique(labels))
        if not 2 <= distinct_clusters < len(labels):
            continue
        results.append({
            "cluster_count": cluster_count,
            "silhouette_score": float(silhouette_score(evaluation_matrix, labels)),
        })
    if not results:
        raise ValueError("No valid cluster counts produced non-degenerate labels for silhouette evaluation.")
    return results


def train_model(
    dataset_path: Path = DEFAULT_DATASET,
    artifact_dir: Path = DEFAULT_ARTIFACT_DIR,
) -> dict[str, Any]:
    """Fit preprocessing and K-Means on the checked-in source dataset and save results."""
    records, dataset_report = load_and_prepare_dataset(dataset_path)
    matrix = _feature_matrix(records)
    missing_columns = [DEFAULT_FEATURES[index] for index in np.flatnonzero(np.isnan(matrix).all(axis=0))]
    if missing_columns:
        raise ValueError(f"Cannot train: selected features have no observed values: {missing_columns}")

    evaluation = evaluate_cluster_counts(matrix)
    best = max(evaluation, key=lambda row: (float(row["silhouette_score"]), -int(row["cluster_count"])))
    model = _make_pipeline(int(best["cluster_count"]))
    labels = model.fit_predict(matrix)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact = {
        "model": model,
        "feature_names": DEFAULT_FEATURES,
        "source_dataset": str(dataset_path.resolve()),
        "dataset_report": asdict(dataset_report),
        "evaluation": evaluation,
        "selected_cluster_count": int(best["cluster_count"]),
        "random_state": RANDOM_STATE,
        "records": records,
    }
    model_path = artifact_dir / "food_kmeans.joblib"
    joblib.dump(artifact, model_path)

    evaluation_path = artifact_dir / "evaluation.json"
    evaluation_path.write_text(
        json.dumps({
            "source_dataset": str(dataset_path.resolve()),
            "dataset_report": asdict(dataset_report),
            "random_state": RANDOM_STATE,
            "selected_cluster_count": artifact["selected_cluster_count"],
            "evaluation": evaluation,
            "interpretation": "Exploratory unsupervised clustering; silhouette is not a nutrition-quality or recommendation metric.",
        }, indent=2),
        encoding="utf-8",
    )
    assignments_path = artifact_dir / "cluster_assignments.csv"
    with assignments_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(["fdc_id", "food_name", "cluster"])
        writer.writerows((record["fdc_id"], record["food_name"], int(label)) for record, label in zip(records, labels))

    return {
        "model_path": model_path,
        "evaluation_path": evaluation_path,
        "assignments_path": assignments_path,
        "dataset_report": dataset_report,
        "evaluation": evaluation,
        "selected_cluster_count": artifact["selected_cluster_count"],
        "training_record_count": len(records),
    }


def predict_food(fdc_id: int, artifact_path: Path = DEFAULT_ARTIFACT_DIR / "food_kmeans.joblib") -> dict[str, int | str]:
    """Return the saved model's cluster for a source food identified by its USDA FDC ID."""
    artifact = joblib.load(artifact_path)
    record = next((item for item in artifact["records"] if item["fdc_id"] == fdc_id), None)
    if record is None:
        raise KeyError(f"USDA food with fdcId {fdc_id} is not present in the model artifact.")
    matrix = _feature_matrix([record], tuple(artifact["feature_names"]))
    cluster = int(artifact["model"].predict(matrix)[0])
    return {"fdc_id": record["fdc_id"], "food_name": record["food_name"], "cluster": cluster}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--artifact-dir", type=Path, default=DEFAULT_ARTIFACT_DIR)
    parser.add_argument("--predict", type=int, help="Predict the cluster for a USDA Foundation Foods fdcId after training.")
    args = parser.parse_args()

    if args.predict is not None:
        result = predict_food(args.predict, args.artifact_dir / "food_kmeans.joblib")
        print(json.dumps(result, indent=2))
        return

    result = train_model(args.dataset, args.artifact_dir)
    print(f"Trained on {result['training_record_count']} USDA records.")
    print(f"Selected k={result['selected_cluster_count']} using highest silhouette score.")
    for row in result["evaluation"]:
        print(f"k={row['cluster_count']}: silhouette={row['silhouette_score']:.6f}")
    print(f"Saved model: {result['model_path']}")
    print(f"Saved evaluation: {result['evaluation_path']}")
    print(f"Saved assignments: {result['assignments_path']}")


if __name__ == "__main__":
    main()
