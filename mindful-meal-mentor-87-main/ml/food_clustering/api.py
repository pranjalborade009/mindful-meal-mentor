"""Private FastAPI inference service for the saved food-clustering model."""

from __future__ import annotations

import hmac
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any

import joblib
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, StrictInt

from .pipeline import DEFAULT_ARTIFACT_DIR, _feature_matrix

API_KEY_ENV = "NUTRIFY_ML_API_KEY"
MODEL_PATH_ENV = "NUTRIFY_ML_MODEL_PATH"


class ClusterPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    fdc_id: Annotated[StrictInt, Field(gt=0)]


class ClusterPredictionResponse(BaseModel):
    fdc_id: int
    food_name: str
    cluster: int


class FoodClusterPredictor:
    """Loads one fitted artifact and retains its source-record lookup in memory."""

    def __init__(self, artifact_path: Path) -> None:
        try:
            artifact = joblib.load(artifact_path)
        except (OSError, ValueError, EOFError) as error:
            raise RuntimeError("Unable to load the configured food-clustering model.") from error

        model = artifact.get("model") if isinstance(artifact, dict) else None
        features = artifact.get("feature_names") if isinstance(artifact, dict) else None
        records = artifact.get("records") if isinstance(artifact, dict) else None
        if not callable(getattr(model, "predict", None)) or not isinstance(features, (tuple, list)) or not isinstance(records, list):
            raise RuntimeError("The configured food-clustering artifact has an invalid format.")

        by_id: dict[int, dict[str, Any]] = {}
        for record in records:
            if not isinstance(record, dict):
                continue
            fdc_id = record.get("fdc_id")
            if isinstance(fdc_id, int) and not isinstance(fdc_id, bool) and isinstance(record.get("features"), dict):
                if fdc_id in by_id:
                    raise RuntimeError("The configured food-clustering artifact contains duplicate food IDs.")
                by_id[fdc_id] = record
        if not by_id:
            raise RuntimeError("The configured food-clustering artifact contains no source records.")

        self._model = model
        self._features = tuple(features)
        self._records = by_id

    def predict(self, fdc_id: int) -> ClusterPredictionResponse:
        record = self._records.get(fdc_id)
        if record is None:
            raise KeyError(fdc_id)
        matrix = _feature_matrix([record], self._features)
        if not np.isfinite(matrix).any():
            raise RuntimeError("The source food has no usable model features.")
        cluster = int(self._model.predict(matrix)[0])
        return ClusterPredictionResponse(
            fdc_id=fdc_id,
            food_name=record["food_name"],
            cluster=cluster,
        )


def _default_artifact_path() -> Path:
    configured = os.environ.get(MODEL_PATH_ENV)
    return Path(configured).expanduser() if configured else DEFAULT_ARTIFACT_DIR / "food_kmeans.joblib"


def create_app(
    *,
    predictor: FoodClusterPredictor | None = None,
    api_key: str | None = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if predictor is None:
            app.state.food_cluster_predictor = FoodClusterPredictor(_default_artifact_path())
        else:
            app.state.food_cluster_predictor = predictor
        yield

    app = FastAPI(
        title="NUTRIFY Food Clustering API",
        version="1.0.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.api_key_override = api_key

    @app.post("/v1/predictions/food-cluster", response_model=ClusterPredictionResponse)
    async def predict_food_cluster(
        body: ClusterPredictionRequest,
        request: Request,
        supplied_key: Annotated[str | None, Header(alias="X-ML-API-Key")] = None,
    ) -> ClusterPredictionResponse:
        expected_key = request.app.state.api_key_override
        if expected_key is None:
            expected_key = os.environ.get(API_KEY_ENV)
        if not isinstance(expected_key, str) or len(expected_key) < 32:
            raise HTTPException(status_code=503, detail="ML prediction service is not configured.")
        if not isinstance(supplied_key, str) or not hmac.compare_digest(supplied_key, expected_key):
            raise HTTPException(status_code=401, detail="Unauthorized.")

        model: FoodClusterPredictor | None = getattr(request.app.state, "food_cluster_predictor", None)
        if model is None:
            raise HTTPException(status_code=503, detail="ML prediction service is unavailable.")
        try:
            return model.predict(body.fdc_id)
        except KeyError as error:
            raise HTTPException(status_code=404, detail="Unknown USDA food ID.") from error
        except Exception as error:
            raise HTTPException(status_code=500, detail="Unable to predict a food cluster.") from error

    return app


app = create_app()
