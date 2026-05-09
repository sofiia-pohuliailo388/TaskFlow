import { useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import styles from '../styles/TaskModal.module.css'
import {
  apiGetSubtasks, apiCreateSubtask, apiUpdateSubtask, apiDeleteSubtask,
} from '../api/subtasks'
import {
  apiGetAttachments, apiCreateAttachment, apiDeleteAttachment,
  apiGetSubtaskAttachments, apiCreateSubtaskAttachment, apiDeleteSubtaskAttachment,
} from '../api/attachments'

function toInputDate(iso) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url)
}

function AttachmentIcon({ url }) {
  if (isImageUrl(url)) return <span className={styles.attachmentIcon}>🖼</span>
  if (url.includes('drive.google.com')) return <span className={styles.attachmentIcon}>📂</span>
  return <span className={styles.attachmentIcon}>🔗</span>
}

// ── Subtasks tab ────────────────────────────────────────────────────────────

function SubtasksTab({ taskId }) {
  const [subtasks, setSubtasks] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  // expanded subtask id for attachments
  const [expandedSub, setExpandedSub] = useState(null)
  const [subAttachments, setSubAttachments] = useState({}) // {subtask_id: [...]}
  const [attName, setAttName] = useState('')
  const [attUrl, setAttUrl] = useState('')
  const [attAdding, setAttAdding] = useState(false)

  const load = useCallback(async () => {
    const data = await apiGetSubtasks(taskId)
    setSubtasks(data)
  }, [taskId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const sub = await apiCreateSubtask(taskId, newTitle.trim())
      setSubtasks((p) => [...p, sub])
      setNewTitle('')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(sub) {
    const updated = await apiUpdateSubtask(taskId, sub.id, { is_completed: !sub.is_completed })
    setSubtasks((p) => p.map((s) => (s.id === sub.id ? updated : s)))
  }

  async function handleDelete(subId) {
    await apiDeleteSubtask(taskId, subId)
    setSubtasks((p) => p.filter((s) => s.id !== subId))
    if (expandedSub === subId) setExpandedSub(null)
  }

  async function toggleExpand(sub) {
    if (expandedSub === sub.id) { setExpandedSub(null); return }
    setExpandedSub(sub.id)
    if (!subAttachments[sub.id]) {
      const data = await apiGetSubtaskAttachments(taskId, sub.id)
      setSubAttachments((p) => ({ ...p, [sub.id]: data }))
    }
  }

  async function handleAddSubAtt(subId) {
    if (!attName.trim() || !attUrl.trim()) return
    if (!attUrl.startsWith('http://') && !attUrl.startsWith('https://')) {
      alert('URL must start with http:// or https://')
      return
    }
    setAttAdding(true)
    try {
      const att = await apiCreateSubtaskAttachment(taskId, subId, { name: attName.trim(), url: attUrl.trim() })
      setSubAttachments((p) => ({ ...p, [subId]: [...(p[subId] ?? []), att] }))
      setAttName(''); setAttUrl('')
    } finally {
      setAttAdding(false)
    }
  }

  async function handleDeleteSubAtt(subId, attId) {
    await apiDeleteSubtaskAttachment(taskId, subId, attId)
    setSubAttachments((p) => ({ ...p, [subId]: p[subId].filter((a) => a.id !== attId) }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {subtasks.length === 0 && (
        <p className={styles.emptyHint}>No subtasks yet. Add one below.</p>
      )}

      <div className={styles.subtaskList}>
        {subtasks.map((sub) => (
          <div key={sub.id} className={styles.subtaskRow}>
            <div className={styles.subtaskMain}>
              <input
                type="checkbox"
                className={styles.subtaskCheck}
                checked={sub.is_completed}
                onChange={() => handleToggle(sub)}
              />
              <span className={`${styles.subtaskTitle} ${sub.is_completed ? styles.done : ''}`}>
                {sub.title}
              </span>
              <div className={styles.subtaskActions}>
                <button
                  className={styles.iconBtn}
                  onClick={() => toggleExpand(sub)}
                  title="Attachments"
                >
                  📎
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => handleDelete(sub.id)}
                  title="Delete subtask"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Subtask attachments (expanded) */}
            {expandedSub === sub.id && (
              <div className={styles.attachmentSubRow}>
                {(subAttachments[sub.id] ?? []).map((att) => (
                  <div key={att.id} className={styles.attachmentRow}>
                    <AttachmentIcon url={att.url} />
                    <a href={att.url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                      {att.name}
                    </a>
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => handleDeleteSubAtt(sub.id, att.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className={styles.addRow} style={{ marginTop: 4 }}>
                  <input
                    className={styles.addInput}
                    placeholder="Name"
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    style={{ maxWidth: 110 }}
                  />
                  <input
                    className={styles.addInput}
                    placeholder="https://..."
                    value={attUrl}
                    onChange={(e) => setAttUrl(e.target.value)}
                  />
                  <button
                    className={styles.addBtn}
                    disabled={attAdding}
                    onClick={() => handleAddSubAtt(sub.id)}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="New subtask…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className={styles.addBtn} onClick={handleAdd} disabled={adding || !newTitle.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}

// ── Attachments tab ─────────────────────────────────────────────────────────

function AttachmentsTab({ taskId }) {
  const [attachments, setAttachments] = useState([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const data = await apiGetAttachments(taskId)
    setAttachments(data)
  }, [taskId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!name.trim() || !url.trim()) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://')
      return
    }
    setError(null)
    setAdding(true)
    try {
      const att = await apiCreateAttachment(taskId, { name: name.trim(), url: url.trim() })
      setAttachments((p) => [...p, att])
      setName(''); setUrl('')
    } catch (e) {
      setError(e?.response?.data?.detail ?? 'Failed to add attachment')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(attId) {
    await apiDeleteAttachment(taskId, attId)
    setAttachments((p) => p.filter((a) => a.id !== attId))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {attachments.length === 0 && (
        <p className={styles.emptyHint}>No attachments yet. Add a link below.</p>
      )}

      <div className={styles.attachmentList}>
        {attachments.map((att) => (
          <div key={att.id} className={styles.attachmentRow}>
            <AttachmentIcon url={att.url} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <a href={att.url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>
                {att.name}
              </a>
              {isImageUrl(att.url) && (
                <div style={{ marginTop: 6 }}>
                  <img
                    src={att.url}
                    alt={att.name}
                    style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
            </div>
            <button
              className={`${styles.iconBtn} ${styles.danger}`}
              onClick={() => handleDelete(att.id)}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {error && <p className="error-banner" style={{ fontSize: '0.8125rem' }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className={styles.sectionLabel}>Add link</p>
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="Label (e.g. Design doc)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ maxWidth: 160 }}
          />
          <input
            className={styles.addInput}
            placeholder="https://..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={adding || !name.trim() || !url.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Modal ──────────────────────────────────────────────────────────────

export function TaskModal({ task, onSave, onClose }) {
  const isEdit = !!task
  const [activeTab, setActiveTab] = useState('details')

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [startDate, setStartDate] = useState(task?.start_date ? toInputDate(task.start_date) : '')
  const [dueDate, setDueDate] = useState(task?.due_date ? toInputDate(task.due_date) : '')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function validate() {
    const errs = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate))
      errs.dueDate = 'End date must be after start date'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setApiError(null)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      })
      onClose()
    } catch (err) {
      setApiError(err?.response?.data?.detail ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = isEdit
    ? [{ id: 'details', label: 'Details' }, { id: 'subtasks', label: 'Subtasks' }, { id: 'attachments', label: 'Attachments' }]
    : [{ id: 'details', label: 'Details' }]

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* Header */}
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit task' : 'New task'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.active : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className={styles.body}>
              {apiError && <p className="error-banner">{apiError}</p>}

              <div className="form-group">
                <label htmlFor="task-title">Title</label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: null })) }}
                  className={errors.title ? 'error' : ''}
                  placeholder="What needs to be done?"
                  autoFocus
                />
                {errors.title && <span className="field-error">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details (optional)"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-priority">Priority</label>
                <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="task-start">Start date</label>
                  <input id="task-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="task-due">End date</label>
                  <input
                    id="task-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); if (errors.dueDate) setErrors((p) => ({ ...p, dueDate: null })) }}
                    className={errors.dueDate ? 'error' : ''}
                  />
                  {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'subtasks' && isEdit && (
          <>
            <div className={styles.body}>
              <SubtasksTab taskId={task.id} />
            </div>
            <div className={styles.footer}>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {activeTab === 'attachments' && isEdit && (
          <>
            <div className={styles.body}>
              <AttachmentsTab taskId={task.id} />
            </div>
            <div className={styles.footer}>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

TaskModal.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    priority: PropTypes.oneOf(['high', 'medium', 'low']),
    start_date: PropTypes.string,
    due_date: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}

TaskModal.defaultProps = { task: null }
