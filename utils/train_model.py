"""
utils/train_model.py

Full ML pipeline:
  1. Load & clean final_joined_dataset.csv
  2. Handle missing values & outliers
  3. Feature scaling
  4. SMOTE oversampling
  5. Model comparison (LR, RF, XGBoost, LightGBM, SVM, KNN)
  6. Hyperparameter tuning on best model
  7. Cross-validation
  8. Save best model + scaler + metadata
"""

import os
import json
import joblib
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import (
    train_test_split, cross_val_score, GridSearchCV, StratifiedKFold
)
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score,
    classification_report, confusion_matrix
)
from sklearn.pipeline import Pipeline
from imblearn.over_sampling import SMOTE

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
# CSV lives one directory above the project root (.ipynb_checkpoints)
DATA_PATH  = BASE_DIR.parent / "final_joined_dataset.csv"
MODEL_DIR  = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_PATH   = MODEL_DIR / "best_model.pkl"
SCALER_PATH  = MODEL_DIR / "scaler.pkl"
META_PATH    = MODEL_DIR / "model_metadata.json"
REPORT_PATH  = MODEL_DIR / "model_report.json"

FEATURE_COLS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]
TARGET_COL = "target"


def load_and_clean_data(path: Path) -> pd.DataFrame:
    """Load CSV, clean, cap outliers, return clean DataFrame."""
    df = pd.read_csv(path)
    print(f"[DATA] Loaded {len(df)} rows, {df.shape[1]} columns.")

    # Keep only known columns
    df = df[[*FEATURE_COLS, TARGET_COL]].copy()

    # Convert all to numeric (coerce errors → NaN)
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # ------------------------------------------------------------------
    # Missing values – fill with median (robust to skew)
    # ------------------------------------------------------------------
    for col in df.columns:
        if df[col].isnull().sum() > 0:
            median_val = df[col].median()
            df[col].fillna(median_val, inplace=True)
            print(f"  [CLEAN] Filled {col} NaN → median {median_val:.2f}")

    # ------------------------------------------------------------------
    # Cap outliers using IQR for continuous columns
    # ------------------------------------------------------------------
    continuous = ["age", "trestbps", "chol", "thalach", "oldpeak"]
    for col in continuous:
        q1, q3 = df[col].quantile(0.05), df[col].quantile(0.95)
        df[col] = df[col].clip(lower=q1, upper=q3)

    # Binarise target: > 0 → 1
    df[TARGET_COL] = (df[TARGET_COL] > 0).astype(int)
    print(f"[DATA] Target distribution:\n{df[TARGET_COL].value_counts().to_dict()}")
    return df


def get_candidate_models():
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "RandomForest":       RandomForestClassifier(n_estimators=100, random_state=42),
        "GradientBoosting":   GradientBoostingClassifier(random_state=42),
        "SVM":                SVC(probability=True, random_state=42),
        "KNN":                KNeighborsClassifier(),
    }
    if HAS_XGB:
        models["XGBoost"] = XGBClassifier(
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42
        )
    if HAS_LGB:
        models["LightGBM"] = LGBMClassifier(random_state=42, verbose=-1)
    return models


def compare_models(X_train, y_train, X_test, y_test):
    """Train all candidates, return results dict sorted by AUC."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    for name, model in get_candidate_models().items():
        try:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_prob = model.predict_proba(X_test)[:, 1]
            cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
            results[name] = {
                "model":       model,
                "accuracy":    accuracy_score(y_test, y_pred),
                "auc":         roc_auc_score(y_test, y_prob),
                "f1":          f1_score(y_test, y_pred),
                "cv_mean_auc": cv_scores.mean(),
                "cv_std_auc":  cv_scores.std(),
            }
            print(f"  [{name}] AUC={results[name]['auc']:.4f}  "
                  f"Acc={results[name]['accuracy']:.4f}  "
                  f"CV={results[name]['cv_mean_auc']:.4f}±{results[name]['cv_std_auc']:.4f}")
        except Exception as e:
            print(f"  [{name}] FAILED: {e}")

    # Sort by cv_mean_auc
    sorted_results = dict(
        sorted(results.items(), key=lambda x: x[1]["cv_mean_auc"], reverse=True)
    )
    best_name = list(sorted_results.keys())[0]
    print(f"\n[BEST] {best_name} → CV AUC={sorted_results[best_name]['cv_mean_auc']:.4f}")
    return sorted_results, best_name


def tune_model(best_name, best_model, X_train, y_train):
    """Quick GridSearchCV tuning for the best model."""
    param_grids = {
        "LogisticRegression": {
            "C": [0.01, 0.1, 1, 10, 100],
            "solver": ["lbfgs", "liblinear"]
        },
        "RandomForest": {
            "n_estimators": [100, 200],
            "max_depth": [None, 10, 20],
            "min_samples_split": [2, 5]
        },
        "GradientBoosting": {
            "n_estimators": [100, 200],
            "learning_rate": [0.05, 0.1, 0.2],
            "max_depth": [3, 5]
        },
        "XGBoost": {
            "n_estimators": [100, 200],
            "learning_rate": [0.05, 0.1],
            "max_depth": [3, 5, 7],
            "subsample": [0.8, 1.0]
        },
        "LightGBM": {
            "n_estimators": [100, 200],
            "learning_rate": [0.05, 0.1],
            "num_leaves": [31, 63]
        },
        "SVM": {
            "C": [0.1, 1, 10],
            "kernel": ["rbf", "linear"]
        },
        "KNN": {
            "n_neighbors": [3, 5, 7, 9],
            "weights": ["uniform", "distance"]
        },
    }
    grid = param_grids.get(best_name, {})
    if not grid:
        print("[TUNE] No param grid defined; using default model.")
        return best_model

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    gs = GridSearchCV(
        best_model.__class__(**({
            "random_state": 42
        } if "random_state" in best_model.__class__().get_params() else {})),
        grid, cv=cv, scoring="roc_auc", n_jobs=-1, verbose=0
    )
    gs.fit(X_train, y_train)
    print(f"[TUNE] Best params: {gs.best_params_}  AUC={gs.best_score_:.4f}")
    return gs.best_estimator_


def train_and_save():
    """Main entry point: train + save everything."""
    print("=" * 60)
    print("  HEART DISEASE PREDICTION – MODEL TRAINING PIPELINE")
    print("=" * 60)

    # 1. Load
    df = load_and_clean_data(DATA_PATH)
    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values

    # 2. Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 3. SMOTE
    sm = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X_scaled, y)
    print(f"[SMOTE] {len(y)} → {len(y_res)} samples  "
          f"(0:{(y_res==0).sum()}, 1:{(y_res==1).sum()})")

    # 4. Train/test split (on resampled data)
    X_train, X_test, y_train, y_test = train_test_split(
        X_res, y_res, test_size=0.2, random_state=42, stratify=y_res
    )

    # 5. Compare models
    print("\n[COMPARE] Running model comparison …")
    results, best_name = compare_models(X_train, y_train, X_test, y_test)

    # 6. Tune best model
    print(f"\n[TUNE] Tuning {best_name} …")
    best_model_raw = results[best_name]["model"]
    tuned_model = tune_model(best_name, best_model_raw, X_train, y_train)
    tuned_model.fit(X_train, y_train)

    # 7. Final evaluation
    y_pred = tuned_model.predict(X_test)
    y_prob = tuned_model.predict_proba(X_test)[:, 1]
    final_auc = roc_auc_score(y_test, y_prob)
    final_acc = accuracy_score(y_test, y_pred)
    final_f1  = f1_score(y_test, y_pred)

    print(f"\n[FINAL] {best_name} – AUC={final_auc:.4f}  "
          f"Acc={final_acc:.4f}  F1={final_f1:.4f}")
    print(classification_report(y_test, y_pred, target_names=["No Disease", "Disease"]))

    # 8. Save
    joblib.dump(tuned_model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"[SAVE] Model → {MODEL_PATH}")
    print(f"[SAVE] Scaler → {SCALER_PATH}")

    # Model comparison report (JSON serializable)
    report = {}
    for name, r in results.items():
        report[name] = {
            "accuracy":    round(r["accuracy"], 4),
            "auc":         round(r["auc"], 4),
            "f1":          round(r["f1"], 4),
            "cv_mean_auc": round(r["cv_mean_auc"], 4),
            "cv_std_auc":  round(r["cv_std_auc"], 4),
        }

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    metadata = {
        "best_model":    best_name,
        "features":      FEATURE_COLS,
        "target":        TARGET_COL,
        "final_auc":     round(final_auc, 4),
        "final_accuracy":round(final_acc, 4),
        "final_f1":      round(final_f1, 4),
        "smote_applied": True,
        "train_samples": len(X_train),
        "test_samples":  len(X_test),
    }
    with open(META_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[SAVE] Metadata → {META_PATH}")
    print("\n✅  Training complete!")
    return tuned_model, scaler, metadata


if __name__ == "__main__":
    train_and_save()
