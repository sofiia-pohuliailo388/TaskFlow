import { useState } from 'react'
import PropTypes from 'prop-types'
import { StatusBadge } from './StatusBadge'
import styles from '../styles/TaskCard.module.css'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

// Forward-only transitions (mirrors backend logic)
const ALLOWED = {
  pending: ['in_progress'],
  in_progress: ['pending', 'done'],
  done: [],
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverdue(iso, status) {
  if (!iso || status === 'done') return false
  return new Date(iso) < new Date()
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, onShare }) {
  const [confirming, setConfirming] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  async function handleStatusChange(newStatus) {
    if (statusLoading) return
    setStatusLoading(true)
    try {
      await onStatusChange(task.id, newStatus)
    } finally {
      setStatusLoading(false)
    }
  }

  const overdue = isOverdue(task.due_date, task.status)

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <StatusBadge status={task.status} />
          <span className={styles.title} onClick={() => onEdit(task)} title="Click to edit">
            {task.title}
          </span>
        </div>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => onShare(task)}>
            Share
          </button>
          <button className={styles.actionBtn} onClick={() => onEdit(task)}>
            Edit
          </button>
          <button
            className={`${styles.actionBtn} ${styles.delete}`}
            onClick={() => setConfirming(true)}
          >
            ✕
          </button>
        </div>
      </div>

      {task.description && <p className={styles.description}>{task.description}</p>}

      <div className={styles.meta}>
        {task.due_date && (
          <span className={`${styles.dueDate} ${overdue ? styles.overdue : ''}`}>
            {overdue ? '⚠ ' : ''}Due {formatDate(task.due_date)}
          </span>
        )}
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>Move to:</span>
        {STATUS_OPTIONS.map((opt) => {
          const allowed = ALLOWED[task.status]?.includes(opt.value)
          const isCurrent = task.status === opt.value
          if (isCurrent) return null
          return (
            <button
              key={opt.value}
              className={`${styles.statusBtn} ${styles[opt.value]}`}
              disabled={!allowed || statusLoading}
              onClick={() => handleStatusChange(opt.value)}
            >
              {opt.label}
            </button>
          )
        })}
        {ALLOWED[task.status]?.length === 0 && (
          <span className={styles.statusLabel}>Task complete</span>
        )}
      </div>

      {confirming && (
        <div className={styles.confirmDelete}>
          <span>Delete &ldquo;{task.title}&rdquo;?</span>
          <button
            className={styles.confirmNo}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
          <button
            className={styles.confirmYes}
            onClick={() => {
              setConfirming(false)
              onDelete(task.id)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  )
}

TaskCard.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.oneOf(['pending', 'in_progress', 'done']).isRequired,
    due_date: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
}
