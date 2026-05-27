import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { predictHeartDisease, downloadReport } from '../services/api'
import { Activity, User, MapPin, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'

const FIELDS = [
  {
    key: 'age', label: 'Age', type: 'number', min: 1, max: 120,
    placeholder: 'Enter age (e.g., 45)',
    hint: 'Your current age in years',
    tooltip: 'Age in years. Normal adult range: 18–100.',
    step: 1,
  },
  {
    key: 'sex', label: 'Gender', type: 'select',
    options: [{ value: 1, label: 'Male' }, { value: 0, label: 'Female' }],
    hint: 'Biological gender',
    tooltip: 'Biological gender of patient.',
  },
  {
    key: 'cp', label: 'Chest Pain Type', type: 'select',
    options: [
      { value: 0, label: '0 – Typical Angina' },
      { value: 1, label: '1 – Atypical Angina' },
      { value: 2, label: '2 – Non-Anginal Pain' },
      { value: 3, label: '3 – Asymptomatic' },
    ],
    hint: 'Type of chest pain experienced',
    tooltip: 'Type of chest pain experienced.',
  },
  {
    key: 'trestbps', label: 'Resting Blood Pressure', type: 'number',
    min: 60, max: 220, placeholder: 'Enter blood pressure (e.g., 120)', unit: 'mmHg',
    hint: 'Blood pressure at rest (normal: 90-120 mmHg)',
    tooltip: 'Normal: 90–120 mmHg.',
    step: 1,
  },
  {
    key: 'chol', label: 'Serum Cholesterol', type: 'number',
    min: 100, max: 600, placeholder: 'Enter cholesterol (e.g., 200)', unit: 'mg/dl',
    hint: 'Total blood cholesterol level (normal: <200 mg/dl)',
    tooltip: 'Total cholesterol. Normal: <200 mg/dL.',
    step: 1,
  },
  {
    key: 'fbs', label: 'Fasting Blood Sugar > 120 mg/dl', type: 'select',
    options: [{ value: 0, label: 'No (≤120 mg/dl)' }, { value: 1, label: 'Yes (>120 mg/dl)' }],
    hint: 'Fasting blood glucose level',
    tooltip: 'Normal: ≤120 mg/dL.',
  },
  {
    key: 'restecg', label: 'Resting ECG Result', type: 'select',
    options: [
      { value: 0, label: '0 – Normal' },
      { value: 1, label: '1 – ST-T wave abnormality' },
      { value: 2, label: '2 – Left ventricular hypertrophy' },
    ],
    hint: 'Resting electrocardiographic results',
    tooltip: 'Heart electrical activity at rest.',
  },
  {
    key: 'thalach', label: 'Maximum Heart Rate', type: 'number',
    min: 50, max: 250, placeholder: 'Enter max HR (e.g., 150)', unit: 'bpm',
    hint: 'Highest heart rate achieved during exercise',
    tooltip: 'Normal: 60–100 BPM.',
    step: 1,
  },
  {
    key: 'exang', label: 'Exercise-Induced Angina', type: 'select',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }],
    hint: 'Chest pain triggered by exercise',
    tooltip: 'Chest pain during exercise.',
  },
  {
    key: 'oldpeak', label: 'ST Depression (Oldpeak)', type: 'number',
    min: 0, max: 10, placeholder: 'Enter ST depression (e.g., 1.0)', step: 0.1,
    hint: 'ST depression induced by exercise relative to rest',
    tooltip: 'ECG abnormality indicator.',
  },
  {
    key: 'slope', label: 'ST Segment Slope', type: 'select',
    options: [
      { value: 0, label: '0 – Upsloping' },
      { value: 1, label: '1 – Flat' },
      { value: 2, label: '2 – Downsloping' },
    ],
    hint: 'Slope of peak exercise ST segment',
    tooltip: 'Slope of ST segment during exercise.',
  },
  {
    key: 'ca', label: 'Major Vessels (CA)', type: 'select',
    options: [
      { value: 0, label: '0 vessels' },
      { value: 1, label: '1 vessel' },
      { value: 2, label: '2 vessels' },
      { value: 3, label: '3 vessels' },
      { value: 4, label: '4 vessels' },
    ],
    hint: 'Number of major vessels colored by fluoroscopy (0-4)',
    tooltip: 'Number of vessels (0–4).',
  },
  {
    key: 'thal', label: 'Thalassemia (Thal)', type: 'select',
    options: [
      { value: 1, label: '1 – Normal' },
      { value: 2, label: '2 – Fixed Defect' },
      { value: 3, label: '3 – Reversible Defect' },
      { value: 6, label: '6 – Fixed Defect (alt)' },
      { value: 7, label: '7 – Reversible Defect (alt)' },
    ],
    hint: 'Thalassemia blood disorder type',
    tooltip: 'Blood disorder type.',
  },
]

// Default example values
const DEFAULTS = {
  patient_name: '', patient_age: '', patient_sex: '', city: '',
  age: '', sex: '', cp: '', trestbps: '', chol: '',
  fbs: '', restecg: '', thalach: '', exang: '',
  oldpeak: '', slope: '', ca: '', thal: ''
}

const RISK_CONFIG = {
  Low: { color: '#111827', wrapperClass: 'risk-card bg-green-50 border-2 border-green-300 shadow-sm rounded-xl p-6', icon: '✅', msg: 'Your risk is low. Keep up your healthy habits!' },
  Medium: { color: '#111827', wrapperClass: 'risk-card bg-yellow-50 border-2 border-yellow-300 shadow-sm rounded-xl p-6', icon: '⚠️', msg: 'Moderate risk detected. Lifestyle changes are recommended.' },
  High: { color: '#111827', wrapperClass: 'risk-card bg-red-50 border-2 border-red-300 shadow-sm rounded-xl p-6', icon: '🚨', msg: 'HIGH RISK — Please seek immediate medical attention!' },
}

export default function PredictionPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [step, setStep] = useState(1) // 1=patient info, 2=clinical data

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value === '' ? '' : Number(value) || value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const payload = {
        ...form,
        patient_age: Number(form.patient_age) || Number(form.age),
      }
      const res = await predictHeartDisease(payload)
      setResult(res.data)
      toast.success('Prediction complete!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Please login to perform predictions")
        return window.location.href = '/login'
      }
      toast.error(err.response?.data?.detail || 'Prediction failed — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (id) => {
    const tid = toast.loading('Generating PDF...')
    try {
      await downloadReport(id)
      toast.success('PDF downloaded!', { id: tid })
    } catch (err) {
      toast.error(err.message || 'Download failed', { id: tid })
    }
  }

  const risk = result ? RISK_CONFIG[result.risk_label] : null

  const loadExample = () => {
    setForm({
      patient_name: 'Rakesh Sharma', patient_age: 58, patient_sex: 'Male', city: 'Mumbai',
      age: 58, sex: 1, cp: 0, trestbps: 130, chol: 270,
      fbs: 0, restecg: 1, thalach: 120, exang: 1,
      oldpeak: 4.0, slope: 1, ca: 2, thal: 3
    })
    toast('📋 Example values loaded', { icon: '📋' })
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="section-header">
          <div className="section-eyebrow">Clinical AI Assessment</div>
          <h1>Heart Disease <span className="gradient-text">Risk Predictor</span></h1>
          <p>Enter your clinical values below for an AI-powered heart disease risk assessment.</p>
        </div>

        {/* Result Card */}
        {result && risk && (
          <div className={risk.wrapperClass} style={{ opacity: 1, marginBottom: 32 }}>
            {result.risk_label === 'High' && (
              <div className="alert-high" style={{ marginBottom: 20 }}>
                <AlertTriangle size={24} color="#111827" />
                <div>
                  <strong style={{ color: '#111827', fontWeight: 700, fontSize: '1.125rem' }}>⚠️ IMMEDIATE MEDICAL ATTENTION REQUIRED</strong>
                  <p style={{ margin: 0, color: '#1f2937', fontWeight: 500, fontSize: '0.875rem' }}>High cardiovascular risk detected. Consult a cardiologist immediately.</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Risk Gauge */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 160, height: 160, borderRadius: '50%',
                  border: `8px solid ${risk.color}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'none',
                  margin: '0 auto',
                  opacity: 1
                }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', fontFamily: 'Outfit, sans-serif' }}>
                    {result.risk_percent.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#1f2937', fontWeight: 700 }}>Risk Score</div>
                </div>
                <div style={{ marginTop: 12, fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>
                  {risk.icon} {result.risk_label} Risk
                </div>
              </div>

              <div style={{ flex: 1, opacity: 1 }}>
                <h3 style={{ color: '#111827', fontWeight: 700, marginBottom: 8, fontSize: '1.125rem' }}>{risk.msg}</h3>
                <p style={{ color: '#1f2937', fontWeight: 500, marginBottom: 16 }}>
                  Prediction ID: <strong>#{result.prediction_id}</strong>
                </p>

                {/* Top SHAP factors */}
                {result.shap_values && Object.keys(result.shap_values).length > 0 && !result.shap_values.error && (
                  <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Top Risk Factors
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      Contributing Features affecting your risk score
                    </p>
                    {Object.entries(result.shap_values).slice(0, 4).map(([key, sv]) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: '0.85rem', minWidth: 160, color: 'var(--text-primary)', fontWeight: 500 }}>{sv.description}</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--secondary)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4,
                            width: `${Math.min(Math.abs(sv.shap_value) * 200, 100)}%`,
                            background: sv.shap_value > 0 ? '#EF4444' : '#10B981',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: sv.shap_value > 0 ? '#EF4444' : '#10B981', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                          {sv.shap_value > 0 ? '+' : ''}{(sv.shap_value * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
                    View Dashboard
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownload(result.prediction_id)}
                    style={{ textDecoration: 'none' }}
                  >
                    📄 Download PDF Report
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recommendations')}>
                    🏥 Health Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--primary)', fontWeight: 700 }}>
              {step === 1 ? '👤 Patient Information' : '🩺 Clinical Measurements'}
            </h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 500 }}>Step {step} of 2</span>
              <button className="btn btn-ghost btn-sm" onClick={loadExample} style={{ fontWeight: 600, color: '#111827' }}>Load Example</button>
            </div>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {[1, 2].map(s => (
              <div key={s} onClick={() => setStep(s)} style={{
                flex: 1, height: 4, borderRadius: 2, cursor: 'pointer',
                background: step >= s ? 'var(--primary)' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div>
                <div className="grid-2" style={{ marginBottom: 20 }}>
                  <div className="form-group">
                    <label>Patient Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                      placeholder="Enter full name (e.g., Samikhya Joshi)"
                      value={form.patient_name}
                      onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                      placeholder="Enter city (e.g., Mumbai)"
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <div className="flex items-center gap-2 group relative">
                      <label className="font-medium">Patient Age</label>

                      <div className="absolute hidden group-hover:block top-6 left-0 z-50 bg-white border border-gray-200 shadow-md rounded-md p-2 text-xs max-w-xs w-max text-gray-700">
                        Age in years. Normal adult range: 18–100.
                      </div>
                    </div>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                      placeholder="Enter age (e.g., 45)"
                      value={form.patient_age}
                      onChange={e => setForm(p => ({ ...p, patient_age: e.target.value, age: e.target.value }))}
                      min={1} max={120}
                    />
                  </div>
                  <div className="form-group">
                    <div className="flex items-center gap-2 group relative">
                      <label className="font-medium">Patient Gender</label>

                      <div className="absolute hidden group-hover:block top-6 left-0 z-50 bg-white border border-gray-200 shadow-md rounded-md p-2 text-xs max-w-xs w-max text-gray-700">
                        Biological gender of patient.
                      </div>
                    </div>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                      value={form.patient_sex}
                      onChange={e => {
                        const v = e.target.value
                        setForm(p => ({ ...p, patient_sex: v, sex: v === 'Male' ? 1 : 0 }))
                      }}
                      required
                    >
                      <option value="" disabled>Select an option</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                    Clinical Data <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid-2" style={{ gap: 16, marginBottom: 24 }}>
                  {FIELDS.map(field => (
                    <div key={field.key} className="form-group">
                      <div className="flex items-center gap-2 group relative">
                        <label className="font-medium" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{field.label}{field.unit && <span style={{ color: '#4A5568', marginLeft: 4 }}>({field.unit})</span>}</span>
                        </label>

                        <div className="absolute hidden group-hover:block top-6 left-0 z-50 bg-white border border-gray-200 shadow-md rounded-md p-2 text-xs max-w-xs w-max text-gray-700 font-normal" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                          {field.tooltip}
                        </div>
                      </div>
                      {field.type === 'select' ? (
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                          value={form[field.key]}
                          onChange={e => handleChange(field.key, e.target.value)}
                          required
                        >
                          <option value="" disabled>Select an option</option>
                          {field.options.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                          type={field.type}
                          placeholder={field.placeholder}
                          value={form[field.key]}
                          onChange={e => handleChange(field.key, e.target.value)}
                          min={field.min} max={field.max} step={field.step}
                          required
                        />
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{field.hint}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                    <ChevronLeft size={18} /> Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                    style={{ minWidth: 200 }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Activity size={20} />
                        Get Risk Assessment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
