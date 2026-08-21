"""Load the trained XGBoost model once and expose a simple predict() function."""
import pickle
from pathlib import Path
import pandas as pd

from app.ml.features import build_feature_frame, align_columns

MODEL_PATH = Path(__file__).resolve().parent / "recovery_model.pkl"

_model = None
_columns = None


def _load():
    global _model, _columns
    if _model is None:
        with open(MODEL_PATH, "rb") as f:
            artifact = pickle.load(f)
        _model = artifact["model"]
        _columns = artifact["columns"]
    return _model, _columns


def predict_recovery_probability(features: dict) -> float:
    """
    features keys expected (see ml/features.py):
    amount, hour, day_of_week, is_subscription, time_since_failure_hr,
    customer_total_transactions, customer_successful_transactions,
    customer_failed_transactions, customer_success_rate, customer_lifetime_value,
    method_matches_preference, prior_recovery_attempts, prior_recovery_successes,
    customer_opted_out, payment_method, failure_reason, customer_preferred_method, segment
    """
    model, columns = _load()
    df = pd.DataFrame([features])
    X = build_feature_frame(df)
    X = align_columns(X, columns)
    proba = model.predict_proba(X)[:, 1][0]
    return float(round(proba, 4))
