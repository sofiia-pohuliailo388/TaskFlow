import { useState } from 'react'
import PropTypes from 'prop-types'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import styles from '../styles/TaskCard.module.css'
import { apiGetSubtasks, apiUpdateSubtask } from '../api/subtasks'
import { apiGetAttachments } from '../api/attachments'

const STATUS_OPTIONS = [
  { value: 'to_do', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const ALLOWED = {
  to_do: ['in_progress'],
  in_progress: ['to_do', 'done'],
  done: [],
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(iso, status) {
  if (!iso || status === 'done') return false
  return new Date(iso) < new Date()
}

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url)
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, onShare }) {
  const [confirming, setConfirming] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  const [expanded, setExpanded] = useState(null) // 'subtasks' | 'attachments' | null
  const [subtasks, setSubtasks] = useState(null)
  const [cardAttachments, setCardAttachments] = useState(null)
  const [loadingSection, setLoadingSection] = useState(false)

  async function handleStatusChange(newStatus) {
    if (statusLoading) return
    setStatusLoading(true)
    try {
      await onStatusChange(task.id, newStatus)
    } finally {
      setStatusLoading(false)
    }
  }

  async function toggleSection(section) {
    if (expanded === section) {
      setExpanded(null)
      return
    }
    setExpanded(section)
    if (section === 'subtasks' && subtasks === null) {
      setLoadingSection(true)
      try {
        const data = await apiGetSubtasks(task.id)
        setSubtasks(data)
      } finally {
        setLoadingSection(false)
      }
    }
    if (section === 'attachments' && cardAttachments === null) {
      setLoadingSection(true)
      try {
        const data = await apiGetAttachments(task.id)
        setCardAttachments(data)
      } finally {
        setLoadingSection(false)
      }
    }
  }

  async function handleToggleSubtask(sub) {
    const updated = await apiUpdateSubtask(task.id, sub.id, { is_completed: !sub.is_completed })
    setSubtasks((prev) => prev.map((s) => (s.id === sub.id ? updated : s)))
  }

  const overdue = isOverdue(task.due_date, task.status)
  const subtaskCount = task.subtask_count ?? 0
  const attachmentCount = task.attachment_count ?? 0

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
          <button className={styles.actionBtn} onClick={() => onShare(task)}>Share</button>
          <button className={styles.actionBtn} onClick={() => onEdit(task)}>Edit</button>
          <button
            className={`${styles.actionBtn} ${styles.delete}`}
            onClick={() => setConfirming(true)}
          >
            ✕
          </button>
        </div>
      </div>

      {task.description && <p className={styles.description}>{task.description}</p>}

      {(subtaskCount > 0 || attachmentCount > 0) && (
        <div className={styles.indicators}>
          <div className={styles.indicatorRow}>
            {subtaskCount > 0 && (
              <button
                className={`${styles.indicator} ${expanded === 'subtasks' ? styles.indicatorActive : ''}`}
                onClick={() => toggleSection('subtasks')}
              >
                ✓ {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''}
                <span className={styles.indicatorArrow}>{expanded === 'subtasks' ? '▲' : '▼'}</span>
              </button>
            )}
            {attachmentCount > 0 && (
              <button
                className={`${styles.indicator} ${expanded === 'attachments' ? styles.indicatorActive : ''}`}
                onClick={() => toggleSection('attachments')}
              >
                📎 {attachmentCount} file{attachmentCount !== 1 ? 's' : ''}
                <span className={styles.indicatorArrow}>{expanded === 'attachments' ? '▲' : '▼'}</span>
              </button>
            )}
          </div>

          {expanded === 'subtasks' && (
            <div className={styles.expandPanel}>
              {loadingSection && <span className={styles.expandHint}>Loading…</span>}
              {subtasks?.map((sub) => (
                <div key={sub.id} className={styles.expandRow}>
                  <button
                    className={`${styles.checkBtn} ${sub.is_completed ? styles.checkBtnDone : ''}`}
                    onClick={() => handleToggleSubtask(sub)}
                    title={sub.is_completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {sub.is_completed ? '✓' : ''}
                  </button>
                  <span className={sub.is_completed ? styles.doneText : styles.expandText}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {expanded === 'attachments' && (
            <div className={styles.expandPanel}>
              {loadingSection && <span className={styles.expandHint}>Loading…</span>}
              {cardAttachments?.map((att) => (
                <div key={att.id} className={styles.expandRow}>
                  <span>{isImageUrl(att.url) ? '🖼' : '📎'}</span>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.attLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {att.name}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.meta}>
        <PriorityBadge priority={task.priority ?? 'medium'} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {task.start_date && (
            <span className={styles.dueDate}>Start: {formatDate(task.start_date)}</span>
          )}
          {task.due_date && (
            <span className={`${styles.dueDate} ${overdue ? styles.overdue : ''}`}>
              {overdue ? '⚠ ' : ''}Due: {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusLabel}>Move to:</span>
        {STATUS_OPTIONS.map((opt) => {
          const allowed = ALLOWED[task.status]?.includes(opt.value)
          if (task.status === opt.value) return null
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
          <button className={styles.confirmNo} onClick={() => setConfirming(false)}>Cancel</button>
          <button
            className={styles.confirmYes}
            onClick={() => { setConfirming(false); onDelete(task.id) }}
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
    status: PropTypes.oneOf(['to_do', 'in_progress', 'done']).isRequired,
    priority: PropTypes.oneOf(['high', 'medium', 'low']),
    start_date: PropTypes.string,
    due_date: PropTypes.string,
    subtask_count: PropTypes.number,
    attachment_count: PropTypes.number,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
}
