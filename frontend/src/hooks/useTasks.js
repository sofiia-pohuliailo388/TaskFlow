import { useCallback, useEffect, useState } from 'react'
import {
  apiGetTasks,
  apiCreateTask,
  apiUpdateTask,
  apiUpdateTaskStatus,
  apiDeleteTask,
} from '../api/tasks'

export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGetTasks()
      setTasks(data)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = useCallback(async (payload) => {
    const task = await apiCreateTask(payload)
    setTasks((prev) => [task, ...prev])
    return task
  }, [])

  const updateTask = useCallback(async (id, payload) => {
    const updated = await apiUpdateTask(id, payload)
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }, [])

  const updateStatus = useCallback(async (id, status) => {
    const updated = await apiUpdateTaskStatus(id, status)
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }, [])

  const deleteTask = useCallback(async (id) => {
    await apiDeleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tasks, loading, error, fetchTasks, createTask, updateTask, updateStatus, deleteTask }
}
