import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('connect_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('connect_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

function unwrap(promise) {
  return promise.then((res) => {
    if (res.data.success === false) throw new Error(res.data.error || 'Unknown error')
    return res.data.data !== undefined ? res.data.data : res.data
  })
}

export const authApi = {
  login: (username, password) => unwrap(api.post('/auth/login', { username, password })),
  me: () => unwrap(api.get('/auth/me')),
  changePassword: (currentPassword, newPassword) =>
    unwrap(api.put('/auth/password', { currentPassword, newPassword })),
}

export const conversationsApi = {
  list: (params) => unwrap(api.get('/conversations', { params })),
  get: (id) => unwrap(api.get(`/conversations/${id}`)),
  create: (data) => unwrap(api.post('/conversations', data)),
  update: (id, data) => unwrap(api.put(`/conversations/${id}`, data)),
  sendMessage: (id, body) => unwrap(api.post(`/conversations/${id}/messages`, { body })),
  addNote: (id, body) => unwrap(api.post(`/conversations/${id}/notes`, { body })),
  deleteNote: (id, noteId) => unwrap(api.delete(`/conversations/${id}/notes/${noteId}`)),
}

export const contactsApi = {
  list: (params) => unwrap(api.get('/contacts', { params })),
  update: (id, data) => unwrap(api.put(`/contacts/${id}`, data)),
}

export const templatesApi = {
  list: () => unwrap(api.get('/templates')),
  create: (data) => unwrap(api.post('/templates', data)),
  update: (id, data) => unwrap(api.put(`/templates/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/templates/${id}`)),
}

export const usersApi = {
  list: () => unwrap(api.get('/users')),
  create: (data) => unwrap(api.post('/users', data)),
  update: (id, data) => unwrap(api.put(`/users/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/users/${id}`)),
}

export const partsApi = {
  searchRos: (search) => unwrap(api.get('/parts/ros', { params: { search } })),
}

export default api
