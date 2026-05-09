import api from './axios'

// Task-level attachments
export async function apiGetAttachments(taskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/attachments`)
  return data
}

export async function apiCreateAttachment(taskId, payload) {
  const { data } = await api.post(`/api/tasks/${taskId}/attachments`, payload)
  return data
}

export async function apiDeleteAttachment(taskId, attachmentId) {
  await api.delete(`/api/tasks/${taskId}/attachments/${attachmentId}`)
}

// Subtask-level attachments
export async function apiGetSubtaskAttachments(taskId, subtaskId) {
  const { data } = await api.get(`/api/tasks/${taskId}/subtasks/${subtaskId}/attachments`)
  return data
}

export async function apiCreateSubtaskAttachment(taskId, subtaskId, payload) {
  const { data } = await api.post(`/api/tasks/${taskId}/subtasks/${subtaskId}/attachments`, payload)
  return data
}

export async function apiDeleteSubtaskAttachment(taskId, subtaskId, attachmentId) {
  await api.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}/attachments/${attachmentId}`)
}
