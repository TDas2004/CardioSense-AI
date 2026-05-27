import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Activity, Shield, ArrowRight, Brain, Clock, FileText, CheckCircle2, ShieldCheck, Stethoscope, Dumbbell, Apple } from 'lucide-react'
import { getModelInfo } from '../services/api'

const SERVICES = [
  { icon: Activity, title: 'Heart Risk Prediction', desc: 'Medical-grade AI assessment of your cardiovascular health.' },
  { icon: Brain, title: 'AI Assistant', desc: '24/7 instant answers to your heart health questions.' },
  { icon: Apple, title: 'Health Plans', desc: 'Personalized diet and exercise routines based on risk level.' },
  { icon: FileText, title: 'Reports & History', desc: 'Securely track your clinical history and download PDFs.' },
]

const EXCELLENCE = ['Cardiology', 'Neurology', 'Diabetes', 'Lifestyle Care', 'Emergency']

const TRUST_CARDS = [
  { title: 'AI Accuracy', desc: 'Over 90% diagnostic precision using advanced ensemble models.', icon: ShieldCheck },
  { title: 'Fast Results', desc: 'Get a comprehensive risk breakdown in less than 2 minutes.', icon: Clock },
  { title: 'Personalized Plans', desc: 'Care plans tailored exactly to your clinical biomarkers.', icon: CheckCircle2 },
  { title: 'Secure Data', desc: 'We prioritize patient privacy with local diagnostic processing.', icon: Shield },
]

export default function HomePage() {
  const [modelInfo, setModelInfo] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getModelInfo().then(r => setModelInfo(r.data)).catch(() => {})
  }, [])

  return (
    <div className="page" style={{ paddingTop: 72 }}>
      {/* ── 1. Hero Section ── */}
      <section className="fade-in-up hero-section" style={{ 
        padding: '80px 24px', 
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="container" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ marginBottom: 24, color: 'var(--primary)', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
            <span style={{ color: 'var(--accent)' }}>AI-Powered</span> <span style={{ color: 'var(--risk-low)' }}>Heart Health</span> Risk Prediction
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.6 }}>
            Early detection saves lives. Experience hospital-grade diagnostic accuracy powered by Machine Learning, identifying cardiovascular risks before they escalate.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/predict')}>
              Get Risk Assessment
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Services / Features Section ── */}
      <section className="section fade-in-up" style={{ background: '#FFFFFF' }}>
        <div className="container">
          <div className="section-header text-center">
            <div className="section-eyebrow">Our Capabilities</div>
            <h2 style={{ color: 'var(--primary)' }}>Advanced Patient Services</h2>
          </div>
          
          <div className="grid-4" style={{ marginTop: 40 }}>
            {SERVICES.map((s, i) => (
              <div key={i} className="glass-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(59,130,246,0.1)', width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={28} color="var(--accent)" />
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 12, color: 'var(--primary)' }}>{s.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. About Section ── */}
      <section className="section fade-in-up" style={{ background: '#EFF6FF' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: 60 }}>
            <div>
              <div className="section-eyebrow">About CardioSense AI</div>
              <h2 style={{ color: 'var(--primary)', marginBottom: 20 }}>Compassionate Care Meets Advanced Technology</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '1.05rem', lineHeight: 1.7 }}>
                At CardioSense AI, we merge clinical expertise with cutting-edge artificial intelligence to provide you with reliable, instant health assessments. We understand that your health is your most valuable asset.
              </p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '1.05rem', lineHeight: 1.7 }}>
                Our platform analyzes 13 distinct biomarkers to give a highly accurate and transparent risk score. Trust in our technology to guide you toward a healthier heart and a better life.
              </p>
              <button className="btn btn-ghost" style={{ background: '#FFFFFF' }} onClick={() => navigate('/about')}>
                Know More
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, transform: 'translateY(20px)' }}>
                <div className="glass-card" style={{ padding: 24, background: '#FFFFFF', borderRadius: 20, textAlign: 'center' }}>
                  <HeartPulse size={40} color="var(--risk-low)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Cardiac Health</div>
                </div>
                <div className="glass-card" style={{ padding: 24, background: '#FFFFFF', borderRadius: 20, textAlign: 'center' }}>
                  <Brain size={40} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>AI Analytics</div>
                </div>
              </div>
              <div className="glass-card" style={{ padding: 24, background: '#FFFFFF', borderRadius: 20, textAlign: 'center', transform: 'translateY(-20px)' }}>
                <ShieldCheck size={48} color="var(--primary-light)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Clinical Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Why Choose Us ── */}
      <section className="section fade-in-up" style={{ background: '#FFFFFF' }}>
        <div className="container">
          <div className="section-header text-center">
            <h2 style={{ color: 'var(--primary)' }}>Why Patients Trust Us</h2>
          </div>
          <div className="grid-4" style={{ marginTop: 40 }}>
             {TRUST_CARDS.map((tc, index) => (
               <div key={index} className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--risk-low)', background: 'var(--bg-main)' }}>
                 <tc.icon size={28} color="var(--primary-light)" style={{ marginBottom: 16 }} />
                 <h3 style={{ color: 'var(--primary)', marginBottom: 8, fontSize: '1.05rem' }}>{tc.title}</h3>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{tc.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* ── 5. Call To Action ── */}
      <section className="section fade-in-up" style={{ background: '#ECFDF5' }}>
        <div className="container">
          <div className="glass-card text-center" style={{ padding: '60px 40px', background: 'var(--primary)', color: '#FFF' }}>
            <HeartPulse size={48} color="var(--risk-low)" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ marginBottom: 16, color: '#FFF' }}>Take Your Heart Health Seriously</h2>
            <p style={{ maxWidth: 500, margin: '0 auto 32px', color: '#CBD5E1', fontSize: '1.1rem' }}>
              Your heart works continuously for you. Give it the attention it deserves with a clinical-grade AI assessment.
            </p>
            <button className="btn" style={{ background: '#FFFFFF', color: 'var(--primary)', padding: '16px 36px', fontSize: '1.1rem', borderRadius: '12px' }} onClick={() => navigate('/predict')}>
              Start Prediction
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
