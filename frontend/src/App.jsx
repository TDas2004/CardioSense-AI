import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { HeartPulse, Heart, Activity, History, BookOpen, Stethoscope, MessageCircle, Home, ArrowUp, Facebook, Twitter, Youtube, Instagram } from 'lucide-react'
import HomePage         from './pages/HomePage.jsx'
import PredictionPage   from './pages/PredictionPage.jsx'
import DashboardPage    from './pages/DashboardPage.jsx'
import HistoryPage      from './pages/HistoryPage.jsx'
import RecommendationPage from './pages/RecommendationPage.jsx'
import ChatbotPage      from './pages/ChatbotPage.jsx'
import LoginPage        from './pages/LoginPage.jsx'

const NAV_ITEMS = [
  { to: '/',              label: 'Home',             icon: Home         },
  { to: '/predict',       label: 'Predict',          icon: Activity     },
  { to: '/dashboard',     label: 'Dashboard',        icon: Stethoscope  },
  { to: '/history',       label: 'History',          icon: History      },
  { to: '/recommendations', label: 'Health Plans',   icon: BookOpen     },
  { to: '/chatbot',       label: 'Cardio Guide',     icon: MessageCircle},
]

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="nav-logo">
          <HeartPulse size={28} color="#10B981" />
          <span className="nav-logo-text">CardioSense AI</span>
        </div>

        <div className="nav-links">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={16} />
                {label}
              </span>
            </NavLink>
          ))}
        </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {localStorage.getItem('token') ? (
              <button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('username'); window.location.href = '/login' }}>
                Logout
              </button>
            ) : (
              <NavLink to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                Login
              </NavLink>
            )}
            <NavLink to="/predict" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              <Activity size={16} />
              Get Risk Score
            </NavLink>
          </div>
        </div>
    </nav>
  )
}

function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer style={{ background: '#061530', paddingTop: '60px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="container grid-auto" style={{ gap: '40px', paddingBottom: '40px' }}>
        <div>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.2rem' }}>Other Links</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>About Us</a></li>
            <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Us</a></li>
            <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>FAQ</a></li>
          </ul>
        </div>
        <div>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.2rem' }}>Services</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><NavLink to="/predict" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Prediction</NavLink></li>
            <li><NavLink to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</NavLink></li>
            <li><NavLink to="/recommendations" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Health Plans</NavLink></li>
            <li><NavLink to="/history" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Reports</NavLink></li>
          </ul>
        </div>
        <div>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.2rem' }}>OPD Hours & Contact</h3>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <li>Mon–Sat: 09:00 AM – 05:00 PM</li>
            <li>Emergency: +1 (800) 123-4567</li>
            <li>Email: support@cardiosense.ai</li>
            <li>Address: 123 Health Ave, Medical District</li>
          </ul>
        </div>
        <div>
          <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '1.2rem' }}>Follow Us</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}><Facebook size={20} /></a>
            <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}><Twitter size={20} /></a>
            <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}><Youtube size={20} /></a>
            <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}><Instagram size={20} /></a>
          </div>
        </div>
      </div>
      
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', paddingBottom: '24px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            © {new Date().getFullYear()} CardioSense AI. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm">Rate Us</button>
            <button onClick={scrollToTop} className="btn btn-primary btn-sm" aria-label="Scroll to top" style={{ padding: '8px', borderRadius: '50%' }}>
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [showTooltip, setShowTooltip] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)

  React.useEffect(() => {
    setShowTooltip(true)
    const timer = setTimeout(() => setShowTooltip(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  const isVisible = showTooltip || isHovered

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <Navbar />
        <div style={{ flex: 1, paddingBottom: 0 }}>
          <Routes>
            <Route path="/"               element={<HomePage />} />
            <Route path="/predict"        element={<PredictionPage />} />
            <Route path="/dashboard"      element={<DashboardPage />} />
            <Route path="/history"        element={<HistoryPage />} />
            <Route path="/recommendations" element={<RecommendationPage />} />
            <Route path="/chatbot"        element={<ChatbotPage />} />
            <Route path="/login"          element={<LoginPage />} />
          </Routes>
        </div>
        <Footer />

        <div 
          style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Assistant Tooltip */}
          <div style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '16px',
            background: 'white',
            color: '#333',
            padding: '12px 16px',
            borderRadius: '12px',
            width: '240px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
            pointerEvents: isVisible ? 'auto' : 'none',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            fontSize: '0.9rem',
            fontWeight: 500,
            lineHeight: 1.5,
            border: '1px solid rgba(0,0,0,0.05)',
          }}>
            Hi, I am Cardio Guide. How can I help you?
            {/* Tooltip Arrow pointing down */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              right: '24px',
              width: '12px',
              height: '12px',
              background: 'white',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              borderRight: '1px solid rgba(0,0,0,0.05)',
              transform: 'rotate(45deg)',
            }} />
          </div>

          <NavLink 
            to="/chatbot" 
            title="Chat with Cardio Guide"
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 60, height: 60, 
              background: 'var(--primary)', color: '#FFF', 
              borderRadius: '50%', 
              boxShadow: 'var(--shadow-md)', transition: 'all 0.2s',
              textDecoration: 'none'
            }} 
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }} 
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
          >
            <MessageCircle size={26} />
          </NavLink>
        </div>
      </div>
    </BrowserRouter>
  )
}
