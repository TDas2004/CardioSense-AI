"""
utils/pdf_report.py

Generates a PDF patient report using ReportLab.
"""

import io
import json
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# ── Colors ────────────────────────────────────────────────────────────────────
BLUE_DARK    = colors.HexColor("#1E3A8A")
BLUE_PRIMARY = colors.HexColor("#3B82F6")
BLUE_LIGHT   = colors.HexColor("#EFF6FF")

GREEN_DARK   = colors.HexColor("#047857")
GREEN_LIGHT  = colors.HexColor("#ECFDF5")
GREEN_BORDER = colors.HexColor("#10B981")

YELLOW_DARK  = colors.HexColor("#B45309")
YELLOW_LIGHT = colors.HexColor("#FEF3C7")
YELLOW_BORDER= colors.HexColor("#F59E0B")

RED_DARK     = colors.HexColor("#B91C1C")
RED_LIGHT    = colors.HexColor("#FEE2E2")
RED_BORDER   = colors.HexColor("#EF4444")

GRAY_LIGHT  = colors.HexColor("#F8FAFC")
GRAY_TEXT   = colors.HexColor("#374151")

RISK_THEMES = {
    "Low":    {"bg": GREEN_LIGHT,  "border": GREEN_BORDER,  "text": GREEN_DARK,  "msg": "LOW RISK – Keep up your healthy habits"},
    "Medium": {"bg": YELLOW_LIGHT, "border": YELLOW_BORDER, "text": YELLOW_DARK, "msg": "MEDIUM RISK – Lifestyle changes recommended"},
    "High":   {"bg": RED_LIGHT,    "border": RED_BORDER,    "text": RED_DARK,    "msg": "HIGH RISK – Immediate Medical Attention Required"},
}

DIET_PLANS = {
    "Low":    [
        "Maintain a balanced Mediterranean diet",
        "Limit saturated fat to <7% of daily calories",
        "Increase fibre: whole grains, legumes, vegetables",
        "Limit sodium to 2,300 mg/day",
        "Stay well hydrated (8+ glasses of water/day)",
    ],
    "Medium": [
        "Follow a heart-healthy DASH diet",
        "Reduce processed & fried foods significantly",
        "Eat oily fish (salmon, mackerel) 2× per week",
        "Replace refined carbs with whole-grain alternatives",
        "Avoid sugar-sweetened beverages",
        "Limit alcohol to ≤1 drink/day",
    ],
    "High":   [
        "Follow a strict low-sodium, low-fat diet immediately",
        "Completely avoid trans-fats and saturated fats",
        "Consult a registered dietitian within 1 week",
        "Limit dietary cholesterol to <200 mg/day",
        "Consume omega-3 rich foods daily",
        "Monitor and record daily food intake",
    ],
}

EXERCISE_PLANS = {
    "Low":    [
        "30 min moderate aerobic activity 5 days/week",
        "Include brisk walking, cycling, or swimming",
        "Add 2 strength-training sessions per week",
        "Aim for 10,000 steps per day",
    ],
    "Medium": [
        "150 min/week moderate-intensity aerobic exercise",
        "Monitor heart rate during exercise (50–70% max HR)",
        "Include low-impact activities: yoga, tai-chi",
        "Avoid high-intensity exercise without medical clearance",
        "Gradually increase activity over 8 weeks",
    ],
    "High":   [
        "Exercise ONLY under medical supervision",
        "Begin with light walking (10 min/day) if cleared",
        "Cardiac rehabilitation program strongly recommended",
        "No strenuous exercise until cardiologist approval",
        "Track symptoms: chest pain, shortness of breath",
    ],
}

LIFESTYLE_PLANS = {
    "Low":    [
        "Maintain healthy weight (BMI 18.5–24.9)",
        "Quit smoking if applicable",
        "Manage stress with mindfulness or meditation",
        "Get 7–9 hours of quality sleep nightly",
        "Schedule annual heart check-up",
    ],
    "Medium": [
        "Schedule cardiology check-up within 1 month",
        "Monitor blood pressure at home weekly",
        "Quit smoking immediately – seek cessation support",
        "Sleep 7–8 hours; treat sleep apnea if present",
        "Reduce work-related stress; consider counselling",
        "Limit caffeine intake",
    ],
    "High":   [
        "Seek immediate medical attention",
        "Do NOT delay cardiology appointment",
        "Take all prescribed medications as directed",
        "Monitor blood pressure and pulse twice daily",
        "Avoid emotional stress and strenuous activities",
        "Inform family members of condition",
        "Keep emergency contact ready at all times",
    ],
}


def generate_pdf_report(prediction_data: dict) -> bytes:
    """
    Generate PDF report; returns raw bytes.
    prediction_data keys:
        patient_name, patient_age, patient_sex, city,
        features, risk_label, risk_percent, risk_probability,
        model_used, shap_values, created_at
    """
    buffer = io.BytesIO()
    doc    = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm, leftMargin=20*mm,
        topMargin=15*mm,   bottomMargin=15*mm
    )

    styles  = getSampleStyleSheet()
    content = []

    # ── Title banner ─────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "BannerTitle",
        parent=styles["Title"],
        fontSize=20, textColor=colors.white,
        alignment=TA_LEFT, spaceAfter=4,
        fontName="Helvetica-Bold"
    )
    sub_style = ParagraphStyle(
        "BannerSub",
        parent=styles["Normal"],
        fontSize=10, textColor=colors.white,
        alignment=TA_LEFT
    )

    banner_data = [
        [Paragraph("Heart Disease Risk Assessment Report", title_style)],
        [Paragraph("AI-Powered Clinical Decision Support", sub_style)],
    ]
    banner_table = Table(banner_data, colWidths=[170*mm])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), BLUE_DARK),
        ("TOPPADDING",  (0,0), (-1,-1), 12),
        ("BOTTOMPADDING",(0,0),(-1,-1), 12),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("RIGHTPADDING",(0,0), (-1,-1), 12),
    ]))
    content.append(banner_table)
    content.append(Spacer(1, 6*mm))

    # ── Patient Summary Card ──────────────────────────────────────────────────
    name  = prediction_data.get("patient_name", "Anonymous")
    age   = prediction_data.get("patient_age", "N/A")
    gender = prediction_data.get("patient_sex", "N/A")
    city  = prediction_data.get("city", "N/A")
    model = prediction_data.get("model_used", "N/A")
    risk_pct = prediction_data.get("risk_percent", 0)

    # We use a white card with a border to look clean
    pt_style = ParagraphStyle("PtStyle", fontSize=10, leading=14, textColor=GRAY_TEXT)
    pt_bold = ParagraphStyle("PtBold", fontSize=10, leading=14, fontName="Helvetica-Bold", textColor=BLUE_DARK)

    col1 = [
        Paragraph(f"<b>Name:</b> {name}", pt_style),
        Paragraph(f"<b>Age:</b> {age}", pt_style),
        Paragraph(f"<b>Gender:</b> {gender}", pt_style),
        Paragraph(f"<b>City:</b> {city}", pt_style),
    ]
    col2 = [
        Paragraph(f"<b>Report Date:</b> {datetime.now().strftime('%B %d, %Y')}", pt_style),
        Paragraph("<b>Assessment Method:</b> AI-Based Risk Analysis", pt_style),
        Paragraph(f"<b>Risk Score:</b> <font color='{BLUE_PRIMARY.hexval()}'>{risk_pct:.1f}%</font>", pt_bold),
    ]

    pt_table = Table([[col1, col2]], colWidths=[85*mm, 85*mm])
    pt_table.setStyle(TableStyle([
        ("BOX",            (0,0), (-1,-1), 1, colors.lightgrey),
        ("BACKGROUND",     (0,0), (-1,-1), colors.white),
        ("VALIGN",         (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",     (0,0), (-1,-1), 10),
        ("BOTTOMPADDING",  (0,0), (-1,-1), 10),
        ("LEFTPADDING",    (0,0), (-1,-1), 10),
        ("RIGHTPADDING",   (0,0), (-1,-1), 10),
    ]))
    content.append(pt_table)
    content.append(Spacer(1, 6*mm))

    # ── Risk Result Section ───────────────────────────────────────────────────
    risk_label = prediction_data.get("risk_label", "Unknown")
    theme = RISK_THEMES.get(risk_label, RISK_THEMES["Low"])

    res_style = ParagraphStyle(
        "RiskResult",
        fontSize=14, textColor=theme["text"],
        alignment=TA_CENTER, fontName="Helvetica-Bold"
    )

    res_table = Table([[Paragraph(theme["msg"], res_style)]], colWidths=[170*mm])
    res_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), theme["bg"]),
        ("BOX",           (0,0), (-1,-1), 2, theme["border"]),
        ("TOPPADDING",    (0,0), (-1,-1), 15),
        ("BOTTOMPADDING", (0,0), (-1,-1), 15),
    ]))
    content.append(res_table)
    content.append(Spacer(1, 8*mm))

    # ── Clinical Input Values ─────────────────────────────────────────────────
    section_style = ParagraphStyle(
        "SectionTitle", fontSize=13, textColor=BLUE_DARK,
        fontName="Helvetica-Bold", spaceBefore=6, spaceAfter=3
    )

    features = prediction_data.get("features", {})
    feature_labels = {
        "age": "Age (years)", "sex": "Gender (1=M,0=F)",
        "cp": "Chest Pain Type (0-3)", "trestbps": "Resting BP (mmHg)",
        "chol": "Cholesterol (mg/dl)", "fbs": "Fasting Blood Sugar >120",
        "restecg": "Resting ECG (0-2)", "thalach": "Max Heart Rate (bpm)",
        "exang": "Exercise Angina", "oldpeak": "ST Depression",
        "slope": "ST Slope (0-2)", "ca": "Major Vessels (0-4)",
        "thal": "Thalassemia (1-3)",
    }

    feat_rows = [["Feature", "Value", "Feature", "Value"]]
    items = list(feature_labels.items())
    for i in range(0, len(items), 2):
        row = []
        for j in range(2):
            if i+j < len(items):
                key, lbl = items[i+j]
                val = features.get(key, "N/A")
                row += [lbl, str(round(float(val), 2)) if val != "N/A" else "N/A"]
            else:
                row += ["", ""]
        feat_rows.append(row)

    ft = Table(feat_rows, colWidths=[55*mm, 30*mm, 55*mm, 30*mm])
    ft.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), BLUE_DARK),
        ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("BACKGROUND",    (0,0), (0,-1), GRAY_LIGHT),
        ("BACKGROUND",    (2,0), (2,-1), GRAY_LIGHT),
        ("FONTNAME",      (0,1), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (2,1), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("GRID",          (0,0), (-1,-1), 0.5, colors.lightgrey),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING",   (0,0), (-1,-1), 5),
    ]))
    content.append(ft)
    content.append(Spacer(1, 4*mm))

    # ── SHAP Top Factors ──────────────────────────────────────────────────────
    shap_vals = prediction_data.get("shap_values", {})
    if shap_vals and "error" not in shap_vals:
        content.append(Paragraph("Key Risk Factors", section_style))
        content.append(HRFlowable(width="100%", thickness=1, color=BLUE_PRIMARY))
        content.append(Spacer(1, 2*mm))

        shap_rows = [["Risk Factor", "Impact %", "Direction"]]
        # Show top 5 features
        for feat, sv in list(shap_vals.items())[:5]:
            shap_v = sv.get("shap_value", 0)
            direction = "↑ Increases Risk" if shap_v > 0 else "↓ Decreases Risk"
            shap_rows.append([
                sv.get("description", feat),
                f"{sv.get('impact_pct', 0):.2f}%",
                direction
            ])

        st = Table(shap_rows, colWidths=[90*mm, 35*mm, 45*mm])
        st.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), BLUE_PRIMARY),
            ("TEXTCOLOR",     (0,0), (-1,0), colors.white),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,-1), 8),
            ("GRID",          (0,0), (-1,-1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.white, BLUE_LIGHT]),
            ("TOPPADDING",    (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING",   (0,0), (-1,-1), 5),
        ]))
        content.append(st)
        content.append(Spacer(1, 4*mm))

    # ── Recommendations ───────────────────────────────────────────────────────
    content.append(Paragraph("Recommended Actions", section_style))
    content.append(HRFlowable(width="100%", thickness=1, color=BLUE_PRIMARY))
    content.append(Spacer(1, 2*mm))

    def rec_section(title, items_list):
        content.append(Paragraph(f"<b>{title}</b>", ParagraphStyle("RecTitle", fontSize=10, textColor=BLUE_DARK, spaceAfter=2)))
        for item in items_list:
            content.append(Paragraph(f"• {item}", ParagraphStyle(
                "Bullet", fontSize=9, leftIndent=10, leading=13, textColor=GRAY_TEXT
            )))
        content.append(Spacer(1, 3*mm))

    rec_section("Diet",      DIET_PLANS.get(risk_label, []))
    rec_section("Exercise",  EXERCISE_PLANS.get(risk_label, []))
    rec_section("Lifestyle", LIFESTYLE_PLANS.get(risk_label, []))

    # ── Disclaimer ────────────────────────────────────────────────────────────
    disc_style = ParagraphStyle(
        "Disclaimer", fontSize=7.5, textColor=GRAY_TEXT,
        alignment=TA_CENTER, leading=11
    )
    content.append(Spacer(1, 3*mm))
    content.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    content.append(Spacer(1, 2*mm))
    content.append(Paragraph(
        "This report is AI-generated and should be reviewed by a medical professional.",
        disc_style
    ))

    doc.build(content)
    buffer.seek(0)
    return buffer.read()
