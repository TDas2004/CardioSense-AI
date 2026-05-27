import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../services/api'
import toast from 'react-hot-toast'
import { Lock, User } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return toast.error("Fields cannot be empty")
    setLoading(true)
    try {
      const data = { username, password }
      const res = isLogin ? await loginUser(data) : await registerUser(data)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('username', res.data.username)
      toast.success(isLogin ? "Logged in successfully" : "Registered successfully")
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page flex-center" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '400px', margin: '20px' }}>
        <h2 style={{ color: 'var(--primary)', textAlign: 'center', marginBottom: 8 }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: 24, fontSize: '0.9rem' }}>
          {isLogin ? 'Sign in to view your private records' : 'Register securely to track your clinical history'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#6B7280" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input 
                type="text" 
                placeholder="Enter username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid var(--border)' }}
                autoComplete="off"
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#6B7280" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input 
                type="password" 
                placeholder="Enter password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid var(--border)' }}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem' }}>
          <span style={{ color: '#6B7280' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
