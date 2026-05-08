import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { apiShareTask } from '../api/tasks'
import styles from '../styles/TaskModal.module.css'

export function ShareModal({ task, onClose }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiShareTask(task.id, email.trim())
      setSent(true)
    } catch (err) {
      setError(err?.response?.data?.detail ?? 'Failed to send share link')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2>Share task</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {sent ? (
          <>
            <div className={styles.body}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '16px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: '2rem' }}>✓</span>
                <p style={{ fontWeight: 600, color: 'var(--color-done)' }}>Share link sent!</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  An email with the task link was sent to <strong>{email}</strong>.
                </p>
              </div>
            </div>
            <div className={styles.footer}>
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.body}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Send a read-only link to &ldquo;{task.title}&rdquo; via email. The link expires in
                7 days.
              </p>

              {error && <p className="error-banner">{error}</p>}

              <div className="form-group">
                <label htmlFor="share-email">Recipient email</label>
                <input
                  id="share-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  className={error ? 'error' : ''}
                  placeholder="colleague@example.com"
                  autoFocus
                />
                {error && <span className="field-error">{error}</span>}
              </div>
            </div>

            <div className={styles.footer}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

ShareModal.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
}
