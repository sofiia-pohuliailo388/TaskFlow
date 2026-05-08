import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetSharedTask } from '../api/tasks'
import { StatusBadge } from '../components/StatusBadge'
import styles from '../styles/SharePage.module.css'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SharePage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await apiGetSharedTask(token)
        setData(result)
      } catch (err) {
        const status = err?.response?.status
        if (status === 410) setError('This share link has expired.')
        else if (status === 404) setError('This share link is invalid or no longer exists.')
        else setError('Failed to load the shared task.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <h2>Link unavailable</h2>
            <p>{error}</p>
            <Link to="/login" style={{ marginTop: 16, display: 'inline-block' }}>
              Go to TaskFlow
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { task, shared_by, expires_at } = data

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Shared task</p>

        <h1 className={styles.title}>{task.title}</h1>

        {task.description && (
          <p className={styles.description}>{task.description}</p>
        )}

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <label>Status</label>
            <StatusBadge status={task.status} />
          </div>
          <div className={styles.metaItem}>
            <label>Due date</label>
            <span>{formatDate(task.due_date)}</span>
          </div>
          <div className={styles.metaItem}>
            <label>Shared by</label>
            <span>{shared_by}</span>
          </div>
          <div className={styles.metaItem}>
            <label>Link expires</label>
            <span>{formatDate(expires_at)}</span>
          </div>
        </div>

        <p className={styles.footer}>
          Powered by <Link to="/login">TaskFlow</Link>
        </p>
      </div>
    </div>
  )
}
