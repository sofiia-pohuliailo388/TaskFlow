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
import { uploadToCloudinary } from '../api/cloudinary'
import { apiEstimateTask } from '../api/tasks'

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

// ── Subtasks tab (edit mode — makes API calls) ───────────────────────────────

function SubtasksTab({ taskId }) {
  const [subtasks, setSubtasks] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [expandedSub, setExpandedSub] = useState(null)
  const [subAttachments, setSubAttachments] = useState({})
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
    setAddError(null)
    try {
      const sub = await apiCreateSubtask(taskId, newTitle.trim())
      setSubtasks((p) => [...p, sub])
      setNewTitle('')
    } catch {
      setAddError('Failed to add subtask. Please try again.')
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

  async function handleUploadSubAtt(subId, file) {
    setAttAdding(true)
    try {
      const { url, name } = await uploadToCloudinary(file)
      const att = await apiCreateSubtaskAttachment(taskId, subId, { name, url })
      setSubAttachments((p) => ({ ...p, [subId]: [...(p[subId] ?? []), att] }))
    } catch {
      alert('Upload failed. Please try again.')
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
                <button className={styles.iconBtn} onClick={() => toggleExpand(sub)} title="Attachments">📎</button>
                <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDelete(sub.id)} title="Delete">✕</button>
              </div>
            </div>
            {expandedSub === sub.id && (
              <div className={styles.attachmentSubRow}>
                {(subAttachments[sub.id] ?? []).map((att) => (
                  <div key={att.id} className={styles.attachmentRow}>
                    <AttachmentIcon url={att.url} />
                    <a href={att.url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>{att.name}</a>
                    <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteSubAtt(sub.id, att.id)}>✕</button>
                  </div>
                ))}
                <div className={styles.addRow} style={{ marginTop: 4 }}>
                  <input className={styles.addInput} placeholder="Name" value={attName} onChange={(e) => setAttName(e.target.value)} style={{ maxWidth: 110 }} />
                  <input className={styles.addInput} placeholder="https://..." value={attUrl} onChange={(e) => setAttUrl(e.target.value)} />
                  <button className={styles.addBtn} disabled={attAdding} onClick={() => handleAddSubAtt(sub.id)}>Add</button>
                  <label className={styles.uploadBtn} title="Upload file">
                    {attAdding ? '⏳' : '📁'}
                    <input type="file" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && handleUploadSubAtt(sub.id, e.target.files[0])} />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {addError && <p className="error-banner" style={{ fontSize: '0.8125rem' }}>{addError}</p>}
      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="New subtask..."
          value={newTitle}
          onChange={(e) => { setNewTitle(e.target.value); setAddError(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className={styles.addBtn} onClick={handleAdd} disabled={adding || !newTitle.trim()}>Add</button>
      </div>
    </div>
  )
}

// ── Attachments tab (edit mode — makes API calls) ────────────────────────────

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

  async function handleUpload(file) {
    setError(null)
    setAdding(true)
    try {
      const { url: fileUrl, name: fileName } = await uploadToCloudinary(file)
      const att = await apiCreateAttachment(taskId, { name: fileName, url: fileUrl })
      setAttachments((p) => [...p, att])
    } catch {
      setError('Upload failed. Please try again.')
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
              <a href={att.url} target="_blank" rel="noreferrer" className={styles.attachmentLink}>{att.name}</a>
              {isImageUrl(att.url) && (
                <div style={{ marginTop: 6 }}>
                  <img src={att.url} alt={att.name} style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                </div>
              )}
            </div>
            <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDelete(att.id)} title="Remove">✕</button>
          </div>
        ))}
      </div>
      {error && <p className="error-banner" style={{ fontSize: '0.8125rem' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className={styles.sectionLabel}>Upload file</p>
        <label className={styles.fileUploadArea}>
          <input type="file" style={{ display: 'none' }} disabled={adding} onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
          {adding ? '⏳ Uploading…' : '📁 Choose file from computer'}
        </label>
        <p className={styles.sectionLabel}>Or add link</p>
        <div className={styles.addRow}>
          <input className={styles.addInput} placeholder="Label (e.g. Design doc)" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 160 }} />
          <input className={styles.addInput} placeholder="https://..." value={url} onChange={(e) => { setUrl(e.target.value); setError(null) }} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <button className={styles.addBtn} onClick={handleAdd} disabled={adding || !name.trim() || !url.trim()}>Add</button>
        </div>
      </div>
    </div>
  )
}

// ── New-task subtasks tab (local state only) ─────────────────────────────────

function NewSubtasksTab({ items, onAdd, onRemove }) {
  const [title, setTitle] = useState('')

  function handleAdd() {
    if (!title.trim()) return
    onAdd(title.trim())
    setTitle('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length === 0 && <p className={styles.emptyHint}>No subtasks yet. Add one below.</p>}
      <div className={styles.subtaskList}>
        {items.map((item) => (
          <div key={item.id} className={styles.subtaskRow}>
            <div className={styles.subtaskMain}>
              <span className={styles.subtaskTitle}>{item.title}</span>
              <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => onRemove(item.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          placeholder="New subtask..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          autoFocus
        />
        <button className={styles.addBtn} onClick={handleAdd} disabled={!title.trim()}>Add</button>
      </div>
    </div>
  )
}

// ── New-task attachments tab (local state only) ──────────────────────────────

function NewAttachmentsTab({ items, onAdd, onRemove }) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleUpload(file) {
    setUploading(true)
    setError(null)
    try {
      const { url: fileUrl, name: fileName } = await uploadToCloudinary(file)
      onAdd({ name: fileName, url: fileUrl })
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function handleAddLink() {
    if (!name.trim() || !url.trim()) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://')
      return
    }
    setError(null)
    onAdd({ name: name.trim(), url: url.trim() })
    setName(''); setUrl('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length === 0 && <p className={styles.emptyHint}>No attachments yet.</p>}
      <div className={styles.attachmentList}>
        {items.map((item) => (
          <div key={item.id} className={styles.attachmentRow}>
            <AttachmentIcon url={item.url} />
            <span className={styles.attachmentLink} style={{ flex: 1 }}>{item.name}</span>
            <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => onRemove(item.id)}>✕</button>
          </div>
        ))}
      </div>
      {error && <p className="error-banner" style={{ fontSize: '0.8125rem' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className={styles.sectionLabel}>Upload file</p>
        <label className={styles.fileUploadArea}>
          <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
          {uploading ? '⏳ Uploading…' : '📁 Choose file from computer'}
        </label>
        <p className={styles.sectionLabel}>Or add link</p>
        <div className={styles.addRow}>
          <input className={styles.addInput} placeholder="Label (e.g. Design doc)" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 160 }} />
          <input className={styles.addInput} placeholder="https://..." value={url} onChange={(e) => { setUrl(e.target.value); setError(null) }} onKeyDown={(e) => e.key === 'Enter' && handleAddLink()} />
          <button className={styles.addBtn} onClick={handleAddLink} disabled={!name.trim() || !url.trim()}>Add</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Modal ───────────────────────────────────────────────────────────────

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

  const [pendingSubtasks, setPendingSubtasks] = useState([])
  const [pendingAttachments, setPendingAttachments] = useState([])

  const [estimate, setEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState(null)

  async function handleEstimate() {
    setEstimating(true)
    setEstimate(null)
    setEstimateError(null)
    try {
      const result = await apiEstimateTask(task.id)
      setEstimate(result)
    } catch {
      setEstimateError('Failed to get estimate. Try again.')
    } finally {
      setEstimating(false)
    }
  }

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
    if (e) e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      setActiveTab('details')
      return
    }
    setSubmitting(true)
    setApiError(null)
    try {
      const savedTask = await onSave({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      })
      if (!isEdit && savedTask?.id) {
        const subtaskErrors = []
        for (const s of pendingSubtasks) {
          try {
            await apiCreateSubtask(savedTask.id, s.title)
          } catch {
            subtaskErrors.push(s.title)
          }
        }
        for (const a of pendingAttachments) {
          try {
            await apiCreateAttachment(savedTask.id, { name: a.name, url: a.url })
          } catch {
            subtaskErrors.push(a.name)
          }
        }
        if (subtaskErrors.length > 0) {
          setApiError(`Task saved, but some items failed to save: ${subtaskErrors.join(', ')}. You can add them in Edit mode.`)
          setActiveTab('details')
          setSubmitting(false)
          return
        }
      }
      onClose()
    } catch (err) {
      setApiError(err?.response?.data?.detail ?? 'Something went wrong')
      setActiveTab('details')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'subtasks', label: 'Subtasks' },
    { id: 'attachments', label: 'Attachments' },
  ]

  const createModeFooter = (
    <div className={styles.footer}>
      <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => handleSubmit(null)}>
        {submitting ? 'Saving…' : 'Create task'}
      </button>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit task' : 'New task'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

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
              {isEdit && (
                <div className={styles.estimateBlock}>
                  <button
                    type="button"
                    className={styles.estimateBtn}
                    onClick={handleEstimate}
                    disabled={estimating}
                  >
                    {estimating ? '⏳ Estimating…' : '✨ Estimate time with AI'}
                  </button>
                  {estimate && (
                    <div className={styles.estimateResult}>
                      <span className={styles.estimateLabel}>Estimated time:</span>
                      <span className={styles.estimateValue}>{estimate}</span>
                    </div>
                  )}
                  {estimateError && (
                    <p className="error-banner" style={{ fontSize: '0.8125rem', marginTop: 6 }}>{estimateError}</p>
                  )}
                </div>
              )}
            </div>
            <div className={styles.footer}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'subtasks' && (
          <>
            <div className={styles.body}>
              {isEdit ? (
                <SubtasksTab taskId={task.id} />
              ) : (
                <NewSubtasksTab
                  items={pendingSubtasks}
                  onAdd={(t) => setPendingSubtasks((p) => [...p, { id: Date.now() + Math.random(), title: t }])}
                  onRemove={(id) => setPendingSubtasks((p) => p.filter((s) => s.id !== id))}
                />
              )}
            </div>
            {isEdit ? (
              <div className={styles.footer}>
                <button className="btn btn-ghost" onClick={onClose}>Close</button>
              </div>
            ) : createModeFooter}
          </>
        )}

        {activeTab === 'attachments' && (
          <>
            <div className={styles.body}>
              {isEdit ? (
                <AttachmentsTab taskId={task.id} />
              ) : (
                <NewAttachmentsTab
                  items={pendingAttachments}
                  onAdd={(item) => setPendingAttachments((p) => [...p, { id: Date.now() + Math.random(), ...item }])}
                  onRemove={(id) => setPendingAttachments((p) => p.filter((a) => a.id !== id))}
                />
              )}
            </div>
            {isEdit ? (
              <div className={styles.footer}>
                <button className="btn btn-ghost" onClick={onClose}>Close</button>
              </div>
            ) : createModeFooter}
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
