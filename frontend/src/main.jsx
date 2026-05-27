import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#0D3260',
          color: '#EDF2F7',
          border: '1px solid rgba(30,144,255,0.3)',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
        },
        success: { iconTheme: { primary: '#00B894', secondary: 'white' } },
        error:   { iconTheme: { primary: '#FF6B6B', secondary: 'white' } },
      }}
    />
  </React.StrictMode>,
)
