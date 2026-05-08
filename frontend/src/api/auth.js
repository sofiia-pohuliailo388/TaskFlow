import api from './axios'

export async function apiRegister(name, email, password) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  return data
}

export async function apiLogin(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data
}

export async function apiRefresh(refreshToken) {
  const { data } = await api.post('/api/auth/refresh', { refresh_token: refreshToken })
  return data
}
