import api from './axios'

export async function apiGetSubtasks(taskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/subtasks`)
  return data
}

export async function apiCreateSubtask(taskId, title) {
  const { data } = await api.post(`/api/tasks/${taskId}/subtasks`, { title })
  return data
}

export async function apiUpdateSubtask(taskId, subtaskId, payload) {
  const { data } = await api.patch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, payload)
  return data
}

export async function apiDeleteSubtask(taskId, subtaskId) {
  await api.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`)
}
