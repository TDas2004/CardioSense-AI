"""
backend/main.py

FastAPI Backend for Heart Disease Prediction System
Endpoints:
  POST /predict          → Run prediction
  GET  /explain/{id}     → SHAP explanation for a past prediction
  GET  /history          → All prediction history
  GET  /history/{id}     → Single prediction
  GET  /report/{id}      → Download PDF report
  POST /chatbot          → AI chatbot query
  POST /recommend-doctor → Doctor recommendation
  GET  /health-plan/{risk} → Health plan by risk level
  GET  /model-info       → Current model metadata
  GET  /model-compare    → Model comparison report
  DELETE /history/{id}   → Delete a prediction record
"""

import os
import sys
import json
import traceback
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, validator
import io
import hashlib
import secrets
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.sql import text

# ── Path setup ─────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from database.database import init_db, get_db, PredictionHistory, User
from utils.predictor import HeartDiseasePredictor, FEATURE_COLS
from utils.chatbot import chatbot_response
from utils.doctors import recommend_doctors
from utils.pdf_report import generate_pdf_report

# ── Init ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Heart Disease Prediction API",
    description="Production-ready API with ML, SHAP, PDF reports, chatbot & doctor recommendations",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB on startup
@app.on_event("startup")
def startup():
    init_db()
    # Pre-load the predictor (avoids cold-start lag)
    try:
        HeartDiseasePredictor.get_instance()
        print("[STARTUP] Predictor loaded successfully.")
    except Exception as e:
        print(f"[STARTUP] Predictor not loaded: {e}")


# ── Pydantic Schemas ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    patient_name: str = Field(default="Anonymous", max_length=100)
    patient_age:  float = Field(default=50.0, ge=1, le=120)
    patient_sex:  str = Field(default="Male")
    city:         str = Field(default="")

    # Clinical features
    age:      float = Field(..., ge=1,   le=120,  description="Age in years")
    sex:      float = Field(..., ge=0,   le=1,    description="Sex (1=Male, 0=Female)")
    cp:       float = Field(..., ge=0,   le=3,    description="Chest pain type (0-3)")
    trestbps: float = Field(..., ge=50,  le=250,  description="Resting blood pressure mmHg")
    chol:     float = Field(..., ge=100, le=600,  description="Serum cholesterol mg/dl")
    fbs:      float = Field(..., ge=0,   le=1,    description="Fasting blood sugar >120 (0/1)")
    restecg:  float = Field(..., ge=0,   le=2,    description="Resting ECG (0-2)")
    thalach:  float = Field(..., ge=50,  le=250,  description="Max heart rate bpm")
    exang:    float = Field(..., ge=0,   le=1,    description="Exercise induced angina (0/1)")
    oldpeak:  float = Field(..., ge=0,   le=10,   description="ST depression induced by exercise")
    slope:    float = Field(..., ge=0,   le=2,    description="ST slope (0-2)")
    ca:       float = Field(..., ge=0,   le=4,    description="Number of major vessels (0-4)")
    thal:     float = Field(..., ge=0,   le=7,    description="Thalassemia (0-7)")

    def feature_dict(self):
        return {f: getattr(self, f) for f in FEATURE_COLS}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class DoctorRequest(BaseModel):
    city:       str = Field(..., min_length=2)
    risk_level: str = Field(..., pattern="^(Low|Medium|High)$")
    limit:      int = Field(default=3, ge=1, le=10)


class AuthRequest(BaseModel):
    username: str
    password: str


# ── Auth Helper ────────────────────────────────────────────────────────────────

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
    token = credentials.credentials
    user = db.query(User).filter(User.token == token).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or missing authentication token")
    return user


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# ── Helper ─────────────────────────────────────────────────────────────────────
def get_predictor() -> HeartDiseasePredictor:
    try:
        return HeartDiseasePredictor.get_instance()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model not ready. Please train first: {str(e)}"
        )


HEALTH_PLANS = {
    "Low": {
        "risk_level": "Low",
        "diet": [
            "Follow a balanced Mediterranean-style diet",
            "Eat 5+ servings of fruits & vegetables per day",
            "Choose whole grains over refined carbohydrates",
            "Limit saturated fat to <7% of caloric intake",
            "Stay under 2,300 mg sodium per day",
            "Drink 8+ glasses of water daily",
        ],
        "exercise": [
            "30 minutes moderate aerobic activity 5 days/week",
            "Include brisk walking, swimming, or cycling",
            "2 strength-training sessions per week",
            "Aim for 10,000 steps/day",
            "Stretch daily for flexibility",
        ],
        "lifestyle": [
            "Maintain healthy weight (BMI 18.5–24.9)",
            "Quit smoking completely",
            "Limit alcohol to 1-2 drinks/day maximum",
            "Sleep 7–9 hours per night",
            "Manage stress with mindfulness or meditation",
            "Get annual health check-ups",
        ],
        "monitoring_tips": [
            "Check blood pressure monthly",
            "Annual lipid panel and blood glucose",
            "Regular BMI tracking",
        ]
    },
    "Medium": {
        "risk_level": "Medium",
        "diet": [
            "Strictly follow the DASH diet",
            "Reduce sodium to <1,500 mg/day",
            "Eat oily fish (salmon, mackerel) 2× weekly",
            "Eliminate processed and fried foods",
            "Replace refined carbs with whole grains",
            "Avoid sugar-sweetened beverages completely",
            "Limit alcohol to <1 drink/day",
            "Consider a plant-based protein approach",
        ],
        "exercise": [
            "150 minutes/week moderate aerobic exercise",
            "Monitor heart rate: stay at 50-70% of max HR",
            "Include yoga, tai chi, or Pilates for stress",
            "Avoid high-intensity activities without medical clearance",
            "Gradually increase duration every 2 weeks",
            "Track activity with a fitness device",
        ],
        "lifestyle": [
            "Schedule cardiology appointment within 1 month",
            "Monitor blood pressure 2× per week at home",
            "Quit smoking immediately – seek cessation support",
            "Limit work hours and screen time",
            "Prioritize sleep: 7–8 hours nightly",
            "Practice daily deep breathing exercises",
            "Reduce caffeine to <200 mg/day",
        ],
        "monitoring_tips": [
            "Blood pressure twice weekly",
            "Lipid panel every 6 months",
            "Blood glucose every 3 months",
            "ECG every 6 months",
        ]
    },
    "High": {
        "risk_level": "High",
        "diet": [
            "⚠️ Consult a registered dietitian immediately",
            "Strict low-sodium diet (<1,200 mg/day)",
            "Eliminate ALL trans fats and saturated fats",
            "Restrict dietary cholesterol to <200 mg/day",
            "Small, frequent meals (5-6/day) to reduce cardiac strain",
            "Omega-3 rich foods daily (or supplements if prescribed)",
            "Avoid red meat, full-fat dairy, processed foods",
            "Track all food intake in a diary",
        ],
        "exercise": [
            "🚨 Exercise ONLY under direct medical supervision",
            "Do NOT start exercise without cardiologist clearance",
            "Cardiac rehabilitation program strongly recommended",
            "Begin with 10-min light walks only if cleared",
            "Monitor heart rate and symptoms during all activity",
            "Stop immediately if any chest pain or dizziness",
        ],
        "lifestyle": [
            "🚨 Seek immediate medical attention",
            "Take ALL prescribed medications without missing doses",
            "Monitor blood pressure and pulse TWICE daily",
            "No emotional stress, heavy lifting, or strenuous activity",
            "Keep emergency contacts and hospital number ready",
            "Do NOT ignore any symptoms: chest pain, breathlessness",
            "Inform family members of your condition",
            "Consider cardiac monitoring device (Holter monitor)",
        ],
        "monitoring_tips": [
            "Blood pressure twice daily",
            "ECG weekly or as directed",
            "Monthly blood work (lipids, glucose, kidney function)",
            "Emergency plan in place",
        ]
    }
}


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Heart Disease Prediction API v2.0",
        "status": "running",
        "endpoints": ["/predict", "/history", "/report/{id}", "/chatbot",
                      "/recommend-doctor", "/health-plan/{risk}", "/model-info"]
    }


# ── Auth Routes ───────────────────────────────────────────────────────────────

@app.post("/register", tags=["Auth"])
def register(req: AuthRequest, db=Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    token = secrets.token_hex(16)
    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        token=token
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": token, "user_id": user.id, "username": user.username}


@app.post("/login", tags=["Auth"])
def login(req: AuthRequest, db=Depends(get_db)):
    user = db.query(User).filter(
        User.username == req.username, 
        User.password_hash == hash_password(req.password)
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate new token on login
    user.token = secrets.token_hex(16)
    db.commit()
    return {"token": user.token, "user_id": user.id, "username": user.username}


@app.get("/model-info", tags=["Model"])
def model_info():
    """Return current model metadata."""
    meta_path = BASE_DIR / "models" / "model_metadata.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Model not trained yet. Run utils/train_model.py")
    return json.loads(meta_path.read_text())


@app.get("/model-compare", tags=["Model"])
def model_compare():
    """Return model comparison report."""
    report_path = BASE_DIR / "models" / "model_report.json"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="No comparison report found.")
    return json.loads(report_path.read_text())


@app.post("/predict", tags=["Prediction"])
def predict(req: PredictRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Run heart disease risk prediction and save to history."""
    predictor = get_predictor()

    try:
        features = req.feature_dict()
        result = predictor.predict(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

    # Save to DB
    record = PredictionHistory(
        patient_name    = req.patient_name,
        patient_age     = req.patient_age,
        patient_sex     = req.patient_sex,
        city            = req.city,
        features_json   = json.dumps(features),
        risk_label      = result["risk_label"],
        risk_probability= result["risk_probability"],
        risk_percent    = result["risk_percent"],
        model_used      = result["model_used"],
        shap_json       = json.dumps(result["shap_values"]),
        user_id         = str(current_user.id),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "prediction_id": record.id,
        "patient_name":  req.patient_name,
        "patient_age":   req.patient_age,
        "patient_sex":   req.patient_sex,
        "city":          req.city,
        **result,
        "created_at":    record.created_at.isoformat(),
    }


@app.get("/explain/{prediction_id}", tags=["Prediction"])
def explain(prediction_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Return SHAP explanation for a stored prediction."""
    record = db.query(PredictionHistory).filter(
        PredictionHistory.id == prediction_id,
        PredictionHistory.user_id == str(current_user.id)
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    data = record.to_dict()
    return {
        "prediction_id": prediction_id,
        "risk_label":    data["risk_label"],
        "risk_percent":  data["risk_percent"],
        "shap_values":   data["shap_values"],
    }


@app.get("/history", tags=["History"])
def get_history(
    limit:  int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Retrieve prediction history paginated."""
    records = (
        db.query(PredictionHistory)
        .filter(PredictionHistory.user_id == str(current_user.id))
        .order_by(PredictionHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    total = db.query(PredictionHistory).filter(PredictionHistory.user_id == str(current_user.id)).count()
    return {
        "total":   total,
        "limit":   limit,
        "offset":  offset,
        "records": [r.to_dict() for r in records],
    }


@app.get("/history/{prediction_id}", tags=["History"])
def get_single_history(prediction_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    record = db.query(PredictionHistory).filter(
        PredictionHistory.id == prediction_id,
        PredictionHistory.user_id == str(current_user.id)
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return record.to_dict()


@app.delete("/history/{prediction_id}", tags=["History"])
def delete_history(prediction_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    record = db.query(PredictionHistory).filter(
        PredictionHistory.id == prediction_id,
        PredictionHistory.user_id == str(current_user.id)
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    db.delete(record)
    db.commit()
    return {"message": f"Prediction #{prediction_id} deleted."}


@app.get("/report/{prediction_id}", tags=["Report"])
def download_report(prediction_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    """Generate and stream PDF report for a prediction."""
    record = db.query(PredictionHistory).filter(
        PredictionHistory.id == prediction_id,
        PredictionHistory.user_id == str(current_user.id)
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    data = record.to_dict()
    try:
        pdf_bytes = generate_pdf_report(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

    filename = f"heart_report_{record.patient_name.replace(' ','_')}_{prediction_id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.post("/chatbot", tags=["Chatbot"])
def chatbot(req: ChatRequest):
    """AI rule-based chatbot for heart health queries."""
    resp = chatbot_response(req.message)
    return {
        "category":    resp.category,
        "answer":      resp.answer,
        "suggestions": resp.suggestions,
    }


@app.post("/recommend-doctor", tags=["Doctors"])
def recommend_doctor(req: DoctorRequest):
    """Recommend cardiologists by city and risk level."""
    doctors = recommend_doctors(req.city, req.risk_level, req.limit)
    return {
        "city":       req.city,
        "risk_level": req.risk_level,
        "doctors":    doctors,
        "total":      len(doctors),
    }


@app.get("/health-plan/{risk_level}", tags=["Health Plan"])
def health_plan(risk_level: str):
    """Return personalised health plan for given risk level."""
    plan = HEALTH_PLANS.get(risk_level)
    if not plan:
        raise HTTPException(
            status_code=400,
            detail="risk_level must be one of: Low, Medium, High"
        )
    return plan
