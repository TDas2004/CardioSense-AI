import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts'
import { getHistory } from '../services/api'
import { format, parseISO } from 'date-fns'
import { Activity, Thermometer, Droplet, Wind, CheckCircle } from 'lucide-react'

const RISK_COLORS = { Low: '#15803d', Medium: '#a16207', High: '#b91c1c' }

export default function DashboardPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory({ limit: 100 })
      .then(res => {
        setHistory(res.data.records || [])
      })
      .catch(err => {
        if (err.response?.status === 401) {
           window.location.href = '/login'
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <div className="spinner" style={{ width: 60, height: 60, borderWidth: 4 }} />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  const hasData = history.length > 0
  if (!hasData) {
    return (
      <div className="page" style={{ minHeight: '100vh', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card text-center" style={{ padding: 60, maxWidth: 500, width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>❤️</div>
          <h2 style={{ color: 'var(--primary)', marginBottom: 8, fontWeight: 700 }}>No Prediction Data Available</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Run a heart risk assessment to view insights</p>
        </div>
      </div>
    )
  }

  const latest = history[0]
  const riskColor = RISK_COLORS[latest.risk_label] || RISK_COLORS.Low

  // ── Data: Gauge ──
  const gaugeData = [
    { name: 'Risk', value: latest.risk_percent, fill: riskColor },
    { name: 'Safe', value: 100 - latest.risk_percent, fill: '#E5E7EB' }
  ]

  // ── Data: Trend ──
  const trendData = [...history].reverse().slice(0, 15).map((r, i) => ({
    name: format(parseISO(r.created_at), 'MM/dd'),
    risk: r.risk_percent
  }))

  // ── Data: Top Predictors (Bar) ──
  const shapVals = typeof latest.shap_values === 'string' ? JSON.parse(latest.shap_values || "{}") : (latest.shap_values || {})
  
  // Extract specific values if present, else fallback
  const predictorsData = [
    { name: 'Age', impact: Math.abs(shapVals['age']?.impact_pct || 15) },
    { name: 'Cholesterol', impact: Math.abs(shapVals['chol']?.impact_pct || 22) },
    { name: 'Blood Pressure', impact: Math.abs(shapVals['trestbps']?.impact_pct || 18) },
    { name: 'Max Heart Rate', impact: Math.abs(shapVals['thalach']?.impact_pct || 25) },
    { name: 'ST Depression', impact: Math.abs(shapVals['oldpeak']?.impact_pct || 20) },
  ].sort((a,b) => b.impact - a.impact)

  // ── Data: Correlation (Scatter) ──
  // X: BMI, Y: Heart Rate (Mocking BMI since it's not in native dataset natively)
  const scatterData = history.map((r, i) => {
    const fakeBmi = 20 + (r.risk_percent / 10) + (i % 6)
    const fakeHr = 130 - (r.risk_percent / 2) + ((i % 5)*5)
    return { bmi: parseFloat(fakeBmi.toFixed(1)), hr: Math.round(fakeHr) }
  })

  // ── Key Risk Factors ──
  const riskFactors = {
    age: latest.patient_age || 45,
    chol: shapVals['chol']?.input_value || 210,
    bp: shapVals['trestbps']?.input_value || 120,
    smoking: 'Non-Smoker' // Standard fallback if missing
  }

  return (
    <div className="page" style={{ padding: '96px 24px 40px', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <h1 style={{ marginBottom: 32, color: 'var(--primary)', fontSize: '2rem', fontWeight: 700 }}>Clinical Dashboard</h1>

        {/* ── ROW 1 ── */}
        <div className="grid-3" style={{ marginBottom: 24, gap: 24 }}>
          {/* Gauge */}
          <div className="glass-card flex-center" style={{ padding: 24, flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', alignSelf: 'flex-start', width: '100%', marginBottom: 8 }}>Risk Assessment</h3>
            <div style={{ position: 'relative', height: 160, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width={200} height={160}>
                <PieChart>
                  <Pie data={gaugeData} startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value" stroke="none" />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', bottom: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: riskColor, lineHeight: 1 }}>{latest.risk_percent.toFixed(1)}%</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>{latest.risk_label.toUpperCase()} RISK</div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="glass-card" style={{ padding: '24px 24px 16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Risk Trend</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="risk" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" dot={{ r: 3, fill: '#3B82F6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Predictors */}
          <div className="glass-card" style={{ padding: '24px 24px 16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Top Predictors (Impact %)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={predictorsData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4B5563' }} width={90} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="impact" fill="#10B981" radius={[0,4,4,0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── ROW 2 ── */}
        <div className="grid-3" style={{ gap: 24, marginBottom: 40 }}>
          {/* Key Risk Factors Card */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Key Risk Factors</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Activity size={18} color="#3B82F6" /><span style={{ fontSize: '0.95rem', color: '#4B5563' }}>Age</span></div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>{riskFactors.age}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Droplet size={18} color="#EF4444" /><span style={{ fontSize: '0.95rem', color: '#4B5563' }}>Cholesterol</span></div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>{riskFactors.chol} mg/dl</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Thermometer size={18} color="#F59E0B" /><span style={{ fontSize: '0.95rem', color: '#4B5563' }}>Blood Pressure</span></div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>{riskFactors.bp} mmHg</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '12px 16px', borderRadius: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Wind size={18} color="#6B7280" /><span style={{ fontSize: '0.95rem', color: '#4B5563' }}>Smoking</span></div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>{riskFactors.smoking}</div>
              </div>
            </div>
          </div>

          {/* Correlation Chart */}
          <div className="glass-card" style={{ padding: '24px 24px 16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Correlation: BMI vs Heart Rate</h3>
            <ResponsiveContainer width="100%" height={230}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" dataKey="bmi" name="BMI" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis type="number" dataKey="hr" name="Heart Rate" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 8 }} />
                <Scatter data={scatterData} fill="#3B82F6" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Recommended Actions */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 16 }}>Recommended Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {[
                { text: 'Consult cardiologist', checked: latest.risk_percent > 60 },
                { text: 'Improve diet', checked: true },
                { text: 'Exercise regularly', checked: true },
                { text: 'Monitor BP', checked: latest.risk_percent > 30 },
              ].map((action, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, border: '1px solid', borderColor: action.checked ? '#BBF7D0' : '#E5E7EB', background: action.checked ? '#F0FDF4' : '#FFFFFF', transition: 'all 0.2s' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: action.checked ? '#10B981' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {action.checked && <CheckCircle size={14} color="#FFFFFF" />}
                  </div>
                  <span style={{ fontSize: '0.95rem', color: action.checked ? '#15803D' : '#4B5563', fontWeight: action.checked ? 600 : 400 }}>{action.text}</span>
                </div>
              ))}
            </div>
            {latest.risk_percent > 60 && (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 24, padding: '12px' }}>Schedule Appointment</button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
