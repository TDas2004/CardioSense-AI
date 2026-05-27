import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const predictHeartDisease = (data) => API.post('/predict', data)
export const getHistory = (params) => API.get('/history', { params })
export const getSingleHistory = (id) => API.get(`/history/${id}`)
export const deleteHistory = (id) => API.delete(`/history/${id}`)
export const downloadReport = async (id) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/report/${id}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${response.status}`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heart_report_${id}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export const chatbot = (msg) => API.post('/chatbot', { message: msg })
export const recommendDoctors = (data) => API.post('/recommend-doctor', data)
export const getHealthPlan = (risk) => API.get(`/health-plan/${risk}`)
export const getModelInfo = () => API.get('/model-info')
export const getModelCompare = () => API.get('/model-compare')

export const loginUser = (data) => API.post('/login', data)
export const registerUser = (data) => API.post('/register', data)

export default API
