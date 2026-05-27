import React, { useState, useEffect } from 'react'
import { getHealthPlan, recommendDoctors } from '../services/api'
import toast from 'react-hot-toast'
import { Salad, Dumbbell, Leaf, Stethoscope, MapPin, Star, Phone, Clock, Search } from 'lucide-react'

const RISK_CONFIG = {
  Low:    { color: '#00B894', emoji: '🟢', desc: 'Preventive care and maintenance' },
  Medium: { color: '#FDCB6E', emoji: '🟡', desc: 'Active management required' },
  High:   { color: '#FF6B6B', emoji: '🔴', desc: 'Urgent medical intervention needed' },
}

export default function RecommendationPage() {
  const [selectedRisk, setRisk]  = useState('Medium')
  const [plan, setPlan]          = useState(null)
  const [doctors, setDoctors]    = useState([])
  const [city, setCity]          = useState('')
  const [loadingPlan, setLP]     = useState(false)
  const [loadingDoc, setLD]      = useState(false)
  const [activeTab, setTab]      = useState('diet')

  const fetchPlan = async (risk) => {
    setLP(true)
    try {
      const r = await getHealthPlan(risk)
      setPlan(r.data)
    } catch { toast.error('Failed to load health plan') }
    finally { setLP(false) }
  }

  const fetchDoctors = async () => {
    if (!city) return toast.error('Please enter your city')
    setLD(true)
    try {
      const r = await recommendDoctors({ city, risk_level: selectedRisk, limit: 4 })
      setDoctors(r.data.doctors)
      if (!r.data.doctors.length) toast('No doctors in that city; showing best matches', { icon: 'ℹ️' })
    } catch { toast.error('Failed to find doctors') }
    finally { setLD(false) }
  }

  useEffect(() => { fetchPlan(selectedRisk) }, [selectedRisk])

  const tabContent = {
    diet:      { icon: Salad,    label: 'Diet Plan',      data: plan?.diet      || [] },
    exercise:  { icon: Dumbbell, label: 'Exercise Plan',  data: plan?.exercise  || [] },
    lifestyle: { icon: Leaf,     label: 'Lifestyle Tips', data: plan?.lifestyle || [] },
    monitoring:{ icon: Stethoscope, label: 'Monitoring',  data: plan?.monitoring_tips || [] },
  }

  const risk = RISK_CONFIG[selectedRisk]

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <div className="section-eyebrow">Personalised Health Plans</div>
          <h1>Health <span className="gradient-text">Recommendations</span></h1>
          <p>Personalised diet, exercise, and lifestyle plans based on your risk level.</p>
        </div>

        {/* Risk Level Selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
            <button
              key={level}
              className="glass-card"
              style={{
                padding: '16px 28px', flex: '1 1 180px', textAlign: 'center', cursor: 'pointer',
                border: selectedRisk === level ? `2px solid ${cfg.color}` : '1px solid var(--border)',
                background: selectedRisk === level ? `${cfg.color}15` : 'var(--bg-card)',
                transition: 'all 0.25s',
              }}
              onClick={() => setRisk(level)}
            >
              <div style={{ fontSize: '2rem', marginBottom: 6 }}>{cfg.emoji}</div>
              <div style={{ fontWeight: 700, color: cfg.color, fontSize: '1.1rem' }}>{level} Risk</div>
              <div style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 500, marginTop: 4 }}>{cfg.desc}</div>
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
          {/* Tab Navigation */}
          <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
            {Object.entries(tabContent).map(([key, { icon: Icon, label }]) => (
              <button key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                <Icon size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                {label}
              </button>
            ))}
          </div>

          {loadingPlan ? (
            <div className="flex-center" style={{ minHeight: 200 }}>
              <div className="spinner" />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                {React.createElement(tabContent[activeTab].icon, { size: 24, color: risk.color })}
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: risk.color }}>
                  {tabContent[activeTab].label} – {selectedRisk} Risk
                </h2>
              </div>

              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {tabContent[activeTab].data.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '14px 16px',
                      background: `${risk.color}0D`,
                      border: `1px solid ${risk.color}25`,
                      color: "#111827", 
                      fontWeight: 500,
                      borderRadius: 10,
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <span style={{ color: risk.color, fontWeight: 700, fontSize: '1.1rem', minWidth: 24 }}>
                      {i + 1}.
                    </span>
                    <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Doctor Finder */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Stethoscope size={24} color="#1E90FF" />
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>🏥 Cardiologist Finder</h2>
          </div>
          <p style={{ marginBottom: 20.}}>Find top cardiologists near you based on your risk level.</p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
              <MapPin size={16} color="#4A5568" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                style={{ paddingLeft: 36 }}
                placeholder="Enter your city (e.g. Mumbai)"
                value={city}
                onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchDoctors()}
              />
            </div>
            <button className="btn btn-primary" onClick={fetchDoctors} disabled={loadingDoc}>
              {loadingDoc ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Search size={16} />}
              Find Doctors
            </button>
          </div>

          {doctors.length > 0 && (
            <div className="grid-2" style={{ gap: 16 }}>
              {doctors.map((doc, i) => (
                <div key={i} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px' }}>{doc.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#1E90FF', margin: 0 }}>{doc.specialization}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(253,203,110,0.15)', padding: '4px 10px', borderRadius: 999 }}>
                      <Star size={12} color="#FDCB6E" fill="#FDCB6E" />
                      <span style={{ fontSize: '0.85rem', color: '#FDCB6E', fontWeight: 700 }}>{doc.rating}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { icon: '🏥', label: doc.hospital },
                      { icon: '🎓', label: `${doc.experience_years} years exp.` },
                      { icon: '💰', label: `₹${doc.consultation_fee}` },
                      { icon: '📅', label: doc.available_days },
                    ].map(({ icon, label }) => (
                      <div key={label} style={{ fontSize: '0.82rem', color: '#94A3B8', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span>{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#4A5568', marginBottom: 10, display: 'flex', gap: 6 }}>
                    <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    {doc.address}
                  </div>

                  <a href={`tel:${doc.phone}`} className="btn btn-primary btn-sm w-full" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                    <Phone size={14} />
                    {doc.phone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
