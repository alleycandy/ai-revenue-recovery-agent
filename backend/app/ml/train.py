"""
Train the payment-recovery probability model.

Run from backend/app/ml/:
    python train.py --data ../../../data/transactions.csv
"""
import argparse
import json
import pickle
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix,
)
import xgboost as xgb

sys.path.append(str(Path(__file__).resolve().parent))
from features import build_feature_frame  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="../../../data/transactions.csv")
    ap.add_argument("--model_out", default="recovery_model.pkl")
    ap.add_argument("--metrics_out", default="model_metrics.json")
    args = ap.parse_args()

    df = pd.read_csv(args.data)
    y = df["recovered"]
    X = build_feature_frame(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)

    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds), 4),
        "recall": round(recall_score(y_test, preds), 4),
        "f1": round(f1_score(y_test, preds), 4),
        "roc_auc": round(roc_auc_score(y_test, proba), 4),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "base_recovery_rate": round(float(y.mean()), 4),
    }
    cm = confusion_matrix(y_test, preds).tolist()
    metrics["confusion_matrix"] = {"tn_fp_fn_tp": cm}

    importances = sorted(
        zip(X.columns, model.feature_importances_.tolist()),
        key=lambda t: -t[1],
    )[:15]
    metrics["top_features"] = [{"feature": f, "importance": round(v, 4)} for f, v in importances]

    with open(args.model_out, "wb") as f:
        pickle.dump({"model": model, "columns": list(X.columns)}, f)

    with open(args.metrics_out, "w") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))
    print(f"\nSaved model -> {args.model_out}")
    print(f"Saved metrics -> {args.metrics_out}")


if __name__ == "__main__":
    main()
