import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from ml.food_clustering.api import API_KEY_ENV, MODEL_PATH_ENV, FoodClusterPredictor, create_app
from ml.food_clustering.pipeline import DEFAULT_DATASET, train_model

TEST_API_KEY = "test-only-key-with-at-least-thirty-two-characters"


class FoodClusterApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        artifacts_dir = Path(cls.temp_dir.name) / "artifacts"
        trained = train_model(DEFAULT_DATASET, artifacts_dir)
        cls.predictor = FoodClusterPredictor(trained["model_path"])

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp_dir.cleanup()

    def setUp(self) -> None:
        self.client = TestClient(create_app(predictor=self.predictor, api_key=TEST_API_KEY))
        self.client.__enter__()

    def tearDown(self) -> None:
        self.client.__exit__(None, None, None)

    def test_actual_saved_model_returns_source_id_name_and_cluster(self) -> None:
        artifact_path = Path(self.temp_dir.name) / "artifacts" / "food_kmeans.joblib"
        with patch.dict(os.environ, {
            API_KEY_ENV: TEST_API_KEY,
            MODEL_PATH_ENV: str(artifact_path),
        }):
            with TestClient(create_app()) as client:
                response = client.post(
                    "/v1/predictions/food-cluster",
                    json={"fdc_id": 321358},
                    headers={"X-ML-API-Key": TEST_API_KEY},
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["fdc_id"], 321358)
        self.assertEqual(response.json()["food_name"], "Hummus, commercial")
        self.assertIsInstance(response.json()["cluster"], int)

    def test_rejects_missing_or_invalid_ids(self) -> None:
        for body in ({}, {"fdc_id": 0}, {"fdc_id": -1}, {"fdc_id": 1.5}, {"fdc_id": "321358"}, {"fdc_id": True}):
            with self.subTest(body=body):
                response = self.client.post(
                    "/v1/predictions/food-cluster",
                    json=body,
                    headers={"X-ML-API-Key": TEST_API_KEY},
                )
                self.assertEqual(response.status_code, 422)

    def test_unknown_food_id_returns_not_found(self) -> None:
        response = self.client.post(
            "/v1/predictions/food-cluster",
            json={"fdc_id": 999999999},
            headers={"X-ML-API-Key": TEST_API_KEY},
        )

        self.assertEqual(response.status_code, 404)

    def test_requires_internal_api_key(self) -> None:
        response = self.client.post(
            "/v1/predictions/food-cluster",
            json={"fdc_id": 321358},
        )
        self.assertEqual(response.status_code, 401)

    def test_does_not_start_if_internal_key_is_not_configured(self) -> None:
        client = TestClient(create_app(predictor=self.predictor, api_key=""))
        with client:
            response = client.post(
                "/v1/predictions/food-cluster",
                json={"fdc_id": 321358},
                headers={"X-ML-API-Key": TEST_API_KEY},
            )
        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
