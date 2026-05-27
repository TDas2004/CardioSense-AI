"""
utils/chatbot.py

Rule-based AI health chatbot for heart disease queries.
Returns structured responses with follow-up suggestions.
"""

import re
from dataclasses import dataclass, field
from typing import List


@dataclass
class ChatResponse:
    answer: str
    suggestions: List[str] = field(default_factory=list)
    category: str = "General"


# ── Knowledge Base ─────────────────────────────────────────────────────────────
KB = [
    # Risk factors
    {
        "patterns": [r"risk factor", r"what cause", r"why get heart", r"causes of heart"],
        "answer": (
            "The major risk factors for heart disease include:\n\n"
            "• **High blood pressure (hypertension)** – damages artery walls\n"
            "• **High cholesterol** – builds plaque in arteries\n"
            "• **Smoking** – narrows blood vessels and reduces oxygen\n"
            "• **Diabetes** – high blood sugar damages blood vessels\n"
            "• **Obesity** – increases strain on the heart\n"
            "• **Physical inactivity** – weakens the cardiovascular system\n"
            "• **Family history** – genetic predisposition\n"
            "• **Age & Sex** – men >45 and women >55 are at higher risk\n\n"
            "Managing these factors significantly reduces your risk."
        ),
        "suggestions": [
            "How can I lower my blood pressure?",
            "What is a healthy cholesterol level?",
            "How does diabetes affect the heart?",
        ],
        "category": "Risk Factors"
    },
    # Symptoms
    {
        "patterns": [r"symptom", r"sign", r"how do i know", r"feel like heart attack"],
        "answer": (
            "Common symptoms of heart disease include:\n\n"
            "• **Chest pain or discomfort (angina)** – pressure, squeezing, or burning sensation\n"
            "• **Shortness of breath** – especially during activity or at rest\n"
            "• **Palpitations** – rapid, fluttering, or irregular heartbeat\n"
            "• **Dizziness or lightheadedness**\n"
            "• **Fatigue** – unusual tiredness\n"
            "• **Swelling** in legs, ankles, or feet (edema)\n"
            "• **Pain radiating to arm, neck, jaw, or back**\n\n"
            "⚠️ If you experience severe chest pain, call emergency services immediately!"
        ),
        "suggestions": [
            "What should I do during a heart attack?",
            "How is heart disease diagnosed?",
            "What is angina?",
        ],
        "category": "Symptoms"
    },
    # Cholesterol
    {
        "patterns": [r"cholesterol", r"ldl", r"hdl", r"lipid"],
        "answer": (
            "Understanding cholesterol:\n\n"
            "• **Total Cholesterol**: <200 mg/dL is desirable\n"
            "• **LDL (Bad cholesterol)**: <100 mg/dL optimal; <70 mg/dL for high-risk patients\n"
            "• **HDL (Good cholesterol)**: >60 mg/dL is protective; <40 mg/dL is concerning\n"
            "• **Triglycerides**: <150 mg/dL is normal\n\n"
            "**To improve cholesterol:**\n"
            "• Eat heart-healthy fats (olive oil, avocado, nuts)\n"
            "• Reduce saturated and trans fats\n"
            "• Exercise regularly (30 min, 5 days/week)\n"
            "• Consider medication (statins) if prescribed"
        ),
        "suggestions": [
            "What foods lower cholesterol?",
            "What are statins?",
            "How often should I check my cholesterol?",
        ],
        "category": "Cholesterol"
    },
    # Blood pressure
    {
        "patterns": [r"blood pressure", r"hypertension", r"bp", r"systolic", r"diastolic"],
        "answer": (
            "Blood pressure guide:\n\n"
            "| Category | Systolic | Diastolic |\n"
            "|----------|----------|-----------|\n"
            "| Normal   | <120     | <80       |\n"
            "| Elevated | 120-129  | <80       |\n"
            "| Stage 1 HT | 130-139 | 80-89   |\n"
            "| Stage 2 HT | ≥140   | ≥90      |\n"
            "| Crisis   | >180     | >120      |\n\n"
            "**Ways to lower blood pressure:**\n"
            "• Reduce salt intake (<2,300 mg sodium/day)\n"
            "• Regular aerobic exercise\n"
            "• DASH diet (rich in fruits, vegetables, low-fat dairy)\n"
            "• Limit alcohol and avoid smoking\n"
            "• Reduce stress with meditation or yoga"
        ),
        "suggestions": [
            "What is the DASH diet?",
            "When should I take blood pressure medication?",
            "How do I measure blood pressure at home?",
        ],
        "category": "Blood Pressure"
    },
    # Exercise
    {
        "patterns": [r"exercise", r"workout", r"physical activity", r"gym", r"walk"],
        "answer": (
            "Exercise recommendations for heart health:\n\n"
            "**General Guidelines:**\n"
            "• Aim for 150 min/week of moderate aerobic activity\n"
            "• OR 75 min/week of vigorous activity\n"
            "• Add 2+ strength-training sessions per week\n\n"
            "**Best exercises for the heart:**\n"
            "• Brisk walking, jogging, cycling\n"
            "• Swimming, rowing\n"
            "• Dancing, aerobics classes\n"
            "• Yoga and tai chi (reduce stress)\n\n"
            "**Start slow, progress gradually.** If you have high risk, consult your doctor before starting a new exercise program."
        ),
        "suggestions": [
            "What is the target heart rate during exercise?",
            "Can I exercise after a heart attack?",
            "What exercises should I avoid?",
        ],
        "category": "Exercise"
    },
    # Diet
    {
        "patterns": [r"diet", r"food", r"eat", r"nutrition", r"meal"],
        "answer": (
            "Heart-healthy diet principles:\n\n"
            "**Foods to EAT MORE:**\n"
            "• Fruits and vegetables (5+ servings/day)\n"
            "• Whole grains (oats, brown rice, quinoa)\n"
            "• Lean proteins (fish, chicken, legumes, tofu)\n"
            "• Healthy fats (olive oil, avocado, nuts, seeds)\n"
            "• Low-fat dairy products\n\n"
            "**Foods to LIMIT or AVOID:**\n"
            "• Processed and fast foods\n"
            "• Red and processed meats\n"
            "• Full-fat dairy and trans fats\n"
            "• Sugary drinks and excessive sweets\n"
            "• High-sodium foods (>2,300 mg/day)\n\n"
            "The **Mediterranean diet** is one of the best evidence-based diets for heart health."
        ),
        "suggestions": [
            "What is the Mediterranean diet?",
            "How can I reduce sodium intake?",
            "Are eggs bad for the heart?",
        ],
        "category": "Diet"
    },
    # SHAP / report explanation
    {
        "patterns": [r"shap", r"explain.*report", r"what.*mean.*report", r"feature.*impact"],
        "answer": (
            "**How to read your AI report:**\n\n"
            "• **Risk %**: The probability (0-100%) of heart disease predicted by AI\n"
            "• **Risk Level**: Low (<35%), Medium (35-65%), High (>65%)\n"
            "• **SHAP Values**: Show how each factor *contributed* to your risk:\n"
            "  - Positive SHAP → Increases your risk\n"
            "  - Negative SHAP → Decreases your risk\n"
            "  - Larger magnitude = stronger impact\n\n"
            "**Example:** If 'cholesterol' has SHAP = +0.25, your cholesterol level is "
            "significantly pushing your risk upward.\n\n"
            "This helps identify which specific factors YOU should focus on improving."
        ),
        "suggestions": [
            "What is a normal risk score?",
            "How accurate is the AI prediction?",
            "What should I do with my report?",
        ],
        "category": "Report Explanation"
    },
    # Medication
    {
        "patterns": [r"medication", r"medicine", r"drug", r"statin", r"aspirin", r"pill"],
        "answer": (
            "Common heart medications (always follow your doctor's prescription):\n\n"
            "• **Statins** (atorvastatin, rosuvastatin): Lower LDL cholesterol\n"
            "• **ACE inhibitors** (lisinopril, ramipril): Lower blood pressure, protect kidneys\n"
            "• **Beta-blockers** (metoprolol, atenolol): Slow heart rate, reduce workload\n"
            "• **Aspirin**: Low-dose may be prescribed to prevent clots\n"
            "• **Calcium channel blockers**: Relax arteries, lower BP\n"
            "• **Nitrates (nitroglycerin)**: Relieve angina by dilating vessels\n\n"
            "⚠️ Never stop or change heart medications without consulting your doctor."
        ),
        "suggestions": [
            "What are the side effects of statins?",
            "Should I take aspirin daily?",
            "What happens if I miss a dose?",
        ],
        "category": "Medication"
    },
    # Emergency
    {
        "patterns": [r"emergency", r"heart attack", r"cardiac arrest", r"chest pain severe", r"911"],
        "answer": (
            "🚨 **CARDIAC EMERGENCY – ACT IMMEDIATELY:**\n\n"
            "**Signs of Heart Attack:**\n"
            "• Severe chest pain/pressure lasting >15 minutes\n"
            "• Pain spreading to arm, jaw, neck, or back\n"
            "• Shortness of breath, sweating, nausea\n"
            "• Sudden dizziness or loss of consciousness\n\n"
            "**What to do:**\n"
            "1. **Call emergency services immediately (911 / 112)**\n"
            "2. Chew 325 mg aspirin (if not allergic and available)\n"
            "3. Sit or lie down in a comfortable position\n"
            "4. Loosen tight clothing\n"
            "5. Do NOT drive yourself to the hospital\n"
            "6. Stay on the line with emergency services\n\n"
            "Every minute matters during a heart attack. Early treatment saves lives."
        ),
        "suggestions": [
            "What is the difference between heart attack and cardiac arrest?",
            "What is CPR and how to perform it?",
            "How to use an AED?",
        ],
        "category": "Emergency"
    },
    # Prediction / accuracy
    {
        "patterns": [r"accuracy", r"how accurate", r"reliable", r"trust the.*result", r"ai prediction"],
        "answer": (
            "**About our AI model's accuracy:**\n\n"
            "• Trained on 1,300+ patient records from clinical datasets\n"
            "• Uses ensemble ML (XGBoost/Random Forest/LightGBM) with hyperparameter tuning\n"
            "• **AUC-ROC**: Typically 0.88–0.95 on test data\n"
            "• **SMOTE** applied to handle class imbalance\n"
            "• **5-fold cross-validation** ensures generalisation\n\n"
            "**Important limitations:**\n"
            "• AI predictions are screening tools, NOT diagnoses\n"
            "• Results can have false positives/negatives\n"
            "• A cardiologist evaluation is always required\n"
            "• The model may not account for rare conditions or medications"
        ),
        "suggestions": [
            "What tests does a cardiologist perform?",
            "How is the risk percentage calculated?",
            "What features most affect the prediction?",
        ],
        "category": "AI Accuracy"
    },
]

FALLBACK = ChatResponse(
    answer=(
        "I'm here to help with heart health questions! I can assist with topics like:\n\n"
        "• Risk factors and prevention\n"
        "• Symptoms and warning signs\n"
        "• Diet and exercise recommendations\n"
        "• Medications and treatments\n"
        "• Understanding your AI report\n"
        "• Emergency situations\n\n"
        "Please try rephrasing your question, or choose one of the suggestions below."
    ),
    suggestions=[
        "What are the risk factors for heart disease?",
        "What are common symptoms of heart disease?",
        "How can I improve my heart health?",
        "How do I read my risk report?",
    ],
    category="General"
)


def chatbot_response(message: str) -> ChatResponse:
    """Match user message to KB and return response."""
    msg_lower = message.lower().strip()

    for entry in KB:
        for pattern in entry["patterns"]:
            if re.search(pattern, msg_lower):
                return ChatResponse(
                    answer=entry["answer"],
                    suggestions=entry.get("suggestions", []),
                    category=entry.get("category", "General")
                )

    return FALLBACK
