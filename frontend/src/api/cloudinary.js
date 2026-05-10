import api from './axios'

export async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/api/upload', formData)
  return { url: data.url, name: data.name }
}
