import api from './axios'
import axios from 'axios'

export async function apiGetTasks() {
  const { data } = await api.get('/api/tasks')
  return data
}

export async function apiCreateTask(payload) {
  const { data } = await api.post('/api/tasks', payload)
  return data
}

export async function apiUpdateTask(id, payload) {
  const { data } = await api.patch(`/api/tasks/${id}`, payload)
  return data
}

export async function apiUpdateTaskStatus(id, status) {
  const { data } = await api.patch(`/api/tasks/${id}/status`, { status })
  return data
}

export async function apiDeleteTask(id) {
  await api.delete(`/api/tasks/${id}`)
}

export async function apiShareTask(taskId, recipientEmail) {
  const { data } = await api.post(`/api/share/${taskId}`, { recipient_email: recipientEmail })
  return data
}

export async function apiGenerateSummary(period) {
  const { data } = await api.post('/api/tasks/summary', { period })
  return data.summary
}

export async function apiEstimateTask(taskId) {
  const { data } = await api.post(`/api/tasks/${taskId}/estimate`)
  return data.estimate
}

export async function apiGetSharedTask(token) {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  const { data } = await axios.get(`${base}/api/share/${token}`)
  return data
}
