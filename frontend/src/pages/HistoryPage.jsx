import React, { useState, useEffect } from 'react'
import { getHistory, deleteHistory, downloadReport } from '../services/api'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { Trash2, FileText, TrendingUp, Search, Filter } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const RISK_COLORS = { Low: '#10B981', Medium: '#F59E0B', High: '#EF4444' }

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [riskFilter, setRisk]   = useState('All')
  const [selected, setSelected] = useState(null)

  const load = () => {
    setLoading(true)
    getHistory({ limit: 200 })
      .then(r => { setRecords(r.data.records); setFiltered(r.data.records) })
      .catch(err => {
        if (err.response?.status === 401) {
           toast.error("Please login to view private records")
           window.location.href = '/login'
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let out = records
    if (riskFilter !== 'All') out = out.filter(r => r.risk_label === riskFilter)
    if (search) out = out.filter(r =>
      (r.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.id).includes(search)
    )
    setFiltered(out)
  }, [search, riskFilter, records])

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete prediction #${id}?`)) return
    try {
      await deleteHistory(id)
      toast.success(`Prediction #${id} deleted`)
      load()
    } catch { toast.error('Delete failed') }
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

  // Trend line data
  const trendData = [...records].reverse().slice(-30).map((r, i) => ({
    i: i + 1,
    risk: r.risk_percent,
    date: r.created_at ? format(parseISO(r.created_at), 'MM/dd') : i,
    name: r.patient_name,
  }))

  const detail = selected ? records.find(r => r.id === selected) : null

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <div className="section-eyebrow">Assessment History</div>
          <h1>Prediction <span className="gradient-text">History</span></h1>
          <p>View and manage all past heart disease risk assessments.</p>
        </div>

        {/* Trend mini chart */}
        {trendData.length > 1 && (
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📈 Risk Score Trend (Last {trendData.length} Assessments)</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#0B1F4D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#EDF2F7' }}
                  formatter={(v, n, p) => [`${v.toFixed(1)}%`, p.payload.name || 'Risk']}
                />
                <Line type="monotone" dataKey="risk" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <Search size={16} color="#4A5568" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={{ paddingLeft: 36 }}
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs">
            {['All', 'Low', 'Medium', 'High'].map(r => (
              <button key={r} className={`tab ${riskFilter === r ? 'active' : ''}`} onClick={() => setRisk(r)}>{r}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 24 }}>
          {/* Table */}
          <div className="glass-card" style={{ padding: 20 }}>
            {loading ? (
              <div className="flex-center" style={{ height: 200 }}>
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-center" style={{ height: 200, flexDirection: 'column', gap: 12 }}>
                <TrendingUp size={40} color="#4A5568" />
                <p style={{ color: '#4A5568' }}>No assessments found.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['ID', 'Patient', 'Age', 'Risk Level', 'Risk %', 'Date', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#94A3B8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: selected === r.id ? 'rgba(30,144,255,0.08)' : 'transparent',
                          cursor: 'pointer', transition: 'background 0.2s',
                        }}
                        onClick={() => setSelected(selected === r.id ? null : r.id)}
                        onMouseEnter={e => { if (selected !== r.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        onMouseLeave={e => { if (selected !== r.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <td style={{ padding: '10px 12px', color: '#4A5568', fontSize: '0.85rem' }}>#{r.id}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.9rem' }}>{r.patient_name || 'N/A'}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.9rem' }}>{r.patient_age || '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge badge-${r.risk_label?.toLowerCase()}`}>{r.risk_label}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: RISK_COLORS[r.risk_label], fontSize: '0.95rem' }}>
                          {r.risk_percent?.toFixed(1)}%
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#4A5568' }}>
                          {r.created_at ? format(parseISO(r.created_at), 'MMM d, yyyy HH:mm') : '—'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 10px' }}
                              title="Download PDF"
                              onClick={() => handleDownload(r.id)}
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 10px' }}
                              onClick={() => handleDelete(r.id)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {detail && (
            <div className="glass-card" style={{ padding: 24, position: 'sticky', top: 90, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Details – #{detail.id}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ padding: '4px 8px' }}>✕</button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ padding: 16, background: `${RISK_COLORS[detail.risk_label]}15`, borderRadius: 12, border: `1px solid ${RISK_COLORS[detail.risk_label]}30`, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: RISK_COLORS[detail.risk_label], fontFamily: 'Outfit' }}>
                    {detail.risk_percent?.toFixed(1)}%
                  </div>
                  <span className={`badge badge-${detail.risk_label?.toLowerCase()}`}>{detail.risk_label} Risk</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Patient', value: detail.patient_name || 'N/A' },
                    { label: 'Age', value: detail.patient_age || '—' },
                    { label: 'Gender', value: detail.patient_sex || '—' },
                    { label: 'City', value: detail.city || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.72rem', color: '#4A5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontSize: '0.9rem', marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SHAP summary */}
              {detail.shap_values && Object.keys(detail.shap_values).length > 0 && !detail.shap_values.error && (
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Top SHAP Factors
                  </div>
                  {Object.entries(detail.shap_values).slice(0, 5).map(([key, sv]) => (
                    <div key={key} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.82rem' }}>{sv.description || key}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: sv.shap_value > 0 ? '#EF4444' : '#10B981' }}>
                          {sv.shap_value > 0 ? '+' : ''}{(sv.shap_value * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(Math.abs(sv.shap_value) * 200, 100)}%`,
                            background: sv.shap_value > 0 ? '#EF4444' : '#10B981',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn btn-primary btn-sm w-full"
                onClick={() => handleDownload(detail.id)}
                style={{ marginTop: 16 }}
              >
                📄 Download PDF Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
