import React, { useState, useRef, useEffect } from 'react'
import { chatbot } from '../services/api'
import { Send, Heart, Bot, User, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const WELCOME = {
  id: 'welcome',
  role: 'bot',
  text: `👋 Hello! I'm **Cardio Guide**, your AI health assistant.\n\nI can help you with:\n• Heart disease risk factors\n• Symptoms and warning signs\n• Diet and exercise recommendations\n• Understanding your AI report\n• Emergency guidance\n• And much more!\n\nWhat would you like to know?`,
  suggestions: [
    'What are the main risk factors for heart disease?',
    'What are common heart disease symptoms?',
    'How can I improve my heart health?',
    'How do I read my risk report?',
    'What should I do in a heart emergency?',
  ],
  category: 'Welcome',
}

function formatText(text) {
  // Convert markdown-like syntax to JSX
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function Message({ msg, onSuggestion }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: '85%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: isUser ? 'var(--primary)' : 'var(--secondary)',
          border: '1px solid rgba(59,130,246,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isUser ? <User size={16} color="white" /> : <Bot size={16} color="var(--primary-light)" />}
        </div>

        {/* Bubble */}
        <div className={`chat-bubble ${isUser ? 'chat-user' : 'chat-bot'}`} style={{ maxWidth: '100%' }}>
          {msg.text.split('\n').map((line, i) => (
            <span key={i}>
              {formatText(line)}
              {i < msg.text.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>

      {/* Category tag */}
      {!isUser && msg.category && msg.category !== 'Welcome' && (
        <div style={{ display: 'flex', gap: 6, paddingLeft: 42 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--primary-light)', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(59,130,246,0.2)' }}>
            {msg.category}
          </span>
        </div>
      )}

      {/* Suggestions */}
      {!isUser && msg.suggestions?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 42, maxWidth: '90%' }}>
          {msg.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(s)}
              style={{
                fontSize: '0.8rem', padding: '5px 12px', borderRadius: 999,
                background: 'var(--secondary)', border: '1px solid var(--border-bright)',
                color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(59,130,246,0.1)'; e.target.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--text-secondary)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { id: Date.now(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatbot(text.trim())
      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        text: res.data.answer,
        suggestions: res.data.suggestions || [],
        category: res.data.category,
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      toast.error('Chatbot unavailable — is the server running?')
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot', category: 'Error',
        text: 'Sorry, I\'m having trouble connecting to the server. Please ensure the backend is running.',
        suggestions: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  const QUICK_TOPICS = [
    '❤️ Risk Factors', '🩺 Symptoms', '🥗 Diet Tips',
    '🏃 Exercise', '💊 Medications', '🚨 Emergency',
  ]

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="section-header">
          <div className="section-eyebrow">AI Health Assistant</div>
          <h1>Cardio Guide <span className="gradient-text">AI Chat</span></h1>
          <p>Ask anything about heart health, your risk report, diet, exercise, or symptoms.</p>
        </div>

        {/* Quick topics */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {QUICK_TOPICS.map(topic => {
            const query = topic.replace(/^[\w\W]{2}\s/, '')
            return (
              <button
                key={topic}
                onClick={() => send(query)}
                style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: '0.85rem',
                  background: 'var(--secondary)', border: '1px solid var(--border-bright)',
                  color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(59,130,246,0.1)'; e.target.style.color = 'var(--primary)' }}
                onMouseLeave={e => { e.target.style.background = 'var(--secondary)'; e.target.style.color = 'var(--text-secondary)' }}
              >
                {topic}
              </button>
            )
          })}
        </div>

        {/* Chat window */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '62vh', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={20} color="var(--primary-light)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>Cardio Guide</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--risk-low)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', display: 'inline-block' }} />
                Online – AI Health Assistant
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Sparkles size={18} color="var(--accent-gold)" />
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
            {messages.map(msg => (
              <Message key={msg.id} msg={msg} onSuggestion={send} />
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--secondary)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={16} color="var(--primary-light)" />
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--secondary)', borderRadius: '16px 16px 16px 4px', border: '1px solid var(--border-bright)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                placeholder="Ask about heart health, your risk score, diet, symptoms..."
                style={{ flex: 1 }}
                disabled={loading}
              />
              <button
                className="btn btn-primary"
                style={{ padding: '12px 20px' }}
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
          ⚕️ This AI provides general health information only. It is not a certified medical professional. Always consult a qualified doctor for diagnosis and treatment.
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}
