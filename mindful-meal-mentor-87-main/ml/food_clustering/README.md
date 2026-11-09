# USDA Foundation Foods clustering

This isolated Python module uses seeded K-Means to explore similarity among
USDA Foundation Foods nutrient profiles. It does not produce personalized
recommendations, assess food quality, or alter the application's nutrition
catalogue.

## Data and preprocessing

The default input is the checked-in
`data/usda/FoodData_Central_foundation_food_json_2026-04-30.json` source
snapshot. The model uses values per 100 g for energy (kcal), protein (g), total
fat (g), carbohydrate (g), and dietary fiber (g). It uses the USDA nutrient
IDs already recognized by the application importer: energy `2048`, `2047`,
then `1008`; protein `1003`; fat `1004`; carbohydrate `1005`; fiber `1079`,
then `2033`. Values with incompatible units, non-finite/missing values, and
zero values below a positive limit of quantification are treated as missing.

Non-object source entries, records without a valid positive integer FDC ID or
description, and records with no usable selected nutrients are excluded. Other
missing feature values are median-imputed from the training records before
standard scaling. The report records exclusions and missing-feature counts.
The original FDC ID and USDA description are retained with each model record
and prediction.

## Install, train, inspect, test

From the project root, use Python 3.11+:

```powershell
python -m pip install -r ml/food_clustering/requirements.txt
python -m ml.food_clustering.pipeline
python -m ml.food_clustering.pipeline --predict 321358
python -m uvicorn ml.food_clustering.api:app --host 127.0.0.1 --port 8000
python -m unittest discover -s ml/food_clustering/tests -v
```

Training evaluates `k=2` through `k=8` (bounded by the available record count)
with actual silhouette scores on median-imputed, standardized features.
Degenerate partitions are skipped. A fixed random seed and explicit K-Means
initialization count make the run reproducible. The model with the highest
silhouette score is selected; this is an exploratory internal fit, not a
held-out predictive-accuracy test.

Generated files are written to `ml/food_clustering/artifacts/`:

- `food_kmeans.joblib`: fitted imputer, scaler, K-Means model, feature and
  provenance metadata, source-linked records, and evaluation results.
- `evaluation.json`: dataset exclusions, selected cluster count, and measured
  silhouette scores.
- `cluster_assignments.csv`: source FDC IDs, names, and assigned cluster IDs.

`predict_food(fdc_id)` loads a saved model and predicts the known USDA source
record identified by that FDC ID. It raises `KeyError` when the ID is not part
of the saved training source; it does not guess a match by food name.

## Standalone private prediction API

The FastAPI service loads `food_kmeans.joblib` once at startup. If no model is
present, train it first. The optional server-only `NUTRIFY_ML_MODEL_PATH`
environment variable can point to a different saved artifact.

`POST /v1/predictions/food-cluster` accepts strict JSON such as
`{"fdc_id":321358}` and returns only the source FDC ID, source name, and
predicted cluster. Invalid IDs receive HTTP 422; unknown source IDs receive
HTTP 404. Requests must include `X-ML-API-Key`; the service returns 401 for an
invalid key and 503 when no sufficiently long key is configured. API docs and
CORS are disabled.

The API is retained as a standalone project service; the NUTRIFY website does
not call it. Configure `NUTRIFY_ML_API_KEY` only in the Python server
environment. The key must be at least 32 characters and must not be committed
to source control. Keep the service on loopback for local use and on a private
network or behind network access controls when deployed.

For local PowerShell development:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
$env:NUTRIFY_ML_API_KEY = "<generated value>"
python -m uvicorn ml.food_clustering.api:app --host 127.0.0.1 --port 8000
```

Keep the generated key in the Python server's secret configuration. Do not
expose it to browser code.

The API returns descriptive clusters only. They are not personalized diet
recommendations or clinical guidance.

USDA FoodData Central Foundation Foods are public-domain data; attribution is
requested: U.S. Department of Agriculture, Agricultural Research Service,
FoodData Central: Foundation Foods.
