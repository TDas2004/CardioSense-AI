"""
utils/predictor.py

Loads the trained model + scaler and provides:
  - predict()       → risk label, probability, SHAP values
  - risk_category() → Low / Medium / High
"""

import json
import joblib
import numpy as np
from pathlib import Path

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

BASE_DIR    = Path(__file__).resolve().parent.parent
MODEL_PATH  = BASE_DIR / "models" / "best_model.pkl"
SCALER_PATH = BASE_DIR / "models" / "scaler.pkl"
META_PATH   = BASE_DIR / "models" / "model_metadata.json"

FEATURE_COLS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]

FEATURE_DESCRIPTIONS = {
    "age":      "Age",
    "sex":      "Sex",
    "cp":       "Chest Pain Type",
    "trestbps": "Resting Blood Pressure",
    "chol":     "Cholesterol",
    "fbs":      "Fasting Blood Sugar",
    "restecg":  "Resting ECG",
    "thalach":  "Max Heart Rate",
    "exang":    "Exercise-Induced Angina",
    "oldpeak":  "ST Depression (Oldpeak)",
    "slope":    "ST Slope",
    "ca":       "Major Vessels (CA)",
    "thal":     "Thalassemia (Thal)",
}


class HeartDiseasePredictor:
    _instance = None   # Singleton

    def __init__(self):
        self.model   = joblib.load(MODEL_PATH)
        self.scaler  = joblib.load(SCALER_PATH)
        self.metadata = json.loads(META_PATH.read_text()) if META_PATH.exists() else {}
        self._explainer = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_explainer(self):
        """Lazily initialise SHAP explainer."""
        if self._explainer is None and HAS_SHAP:
            try:
                # Try Tree explainer first (fast)
                self._explainer = shap.TreeExplainer(self.model)
            except Exception:
                # Fall back to Kernel explainer with a small background
                import pandas as pd
                bg = pd.DataFrame(
                    np.zeros((1, len(FEATURE_COLS))), columns=FEATURE_COLS
                )
                bg_scaled = self.scaler.transform(bg.values)
                self._explainer = shap.KernelExplainer(
                    self.model.predict_proba, bg_scaled
                )
        return self._explainer

    def predict(self, features: dict) -> dict:
        """
        features: dict with keys = FEATURE_COLS
        Returns: {
            risk_label, risk_probability, risk_percent,
            shap_values: {feature: value}, model_used
        }
        """
        x = np.array([[features[f] for f in FEATURE_COLS]], dtype=float)
        x_scaled = self.scaler.transform(x)

        prob = float(self.model.predict_proba(x_scaled)[0][1])
        label = self.risk_category(prob)

        # ── SHAP ────────────────────────────────────────────────────────
        shap_dict = {}
        if HAS_SHAP:
            try:
                explainer = self._get_explainer()
                shap_vals = explainer.shap_values(x_scaled)
                # For binary classifiers shap_values returns list[2] or array
                if isinstance(shap_vals, list):
                    vals = shap_vals[1][0]
                else:
                    vals = shap_vals[0] if shap_vals.ndim == 2 else shap_vals

                for i, feat in enumerate(FEATURE_COLS):
                    shap_dict[feat] = {
                        "shap_value":   round(float(vals[i]), 4),
                        "input_value":  round(float(features[feat]), 4),
                        "description":  FEATURE_DESCRIPTIONS[feat],
                        "impact_pct":   round(abs(float(vals[i])) * 100, 2),
                    }
                # Sort by absolute impact desc
                shap_dict = dict(
                    sorted(shap_dict.items(),
                           key=lambda kv: abs(kv[1]["shap_value"]),
                           reverse=True)
                )
            except Exception as e:
                shap_dict = {"error": str(e)}

        return {
            "risk_label":       label,
            "risk_probability": round(prob, 4),
            "risk_percent":     round(prob * 100, 2),
            "shap_values":      shap_dict,
            "model_used":       self.metadata.get("best_model", "Unknown"),
        }

    @staticmethod
    def risk_category(prob: float) -> str:
        if prob < 0.35:
            return "Low"
        elif prob < 0.65:
            return "Medium"
        else:
            return "High"
