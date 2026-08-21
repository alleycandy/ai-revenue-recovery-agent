"""Feature engineering shared by training and inference so they never drift apart."""
import pandas as pd

CATEGORICAL = ["payment_method", "failure_reason", "customer_preferred_method", "segment"]

NUMERIC = [
    "amount",
    "hour",
    "day_of_week",
    "is_subscription",
    "time_since_failure_hr",
    "customer_total_transactions",
    "customer_successful_transactions",
    "customer_failed_transactions",
    "customer_success_rate",
    "customer_lifetime_value",
    "method_matches_preference",
    "prior_recovery_attempts",
    "prior_recovery_successes",
    "customer_opted_out",
]

FEATURE_COLUMNS = NUMERIC + CATEGORICAL


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Return a model-ready dataframe: numeric passthrough + one-hot categoricals."""
    df = df.copy()
    denom = df["prior_recovery_attempts"].astype(float).replace(0, pd.NA)
    df["prior_recovery_rate"] = (df["prior_recovery_successes"] / denom).fillna(0.0).astype(float)
    num_cols = NUMERIC + ["prior_recovery_rate"]
    X = pd.get_dummies(df[num_cols + CATEGORICAL], columns=CATEGORICAL)
    return X


def align_columns(X: pd.DataFrame, trained_columns: list[str]) -> pd.DataFrame:
    """Ensure inference-time one-hot columns exactly match what the model was trained on."""
    for col in trained_columns:
        if col not in X.columns:
            X[col] = 0
    return X[trained_columns]
