import { useCallback, useEffect, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { TaskModal } from '../components/TaskModal'
import { ShareModal } from '../components/ShareModal'
import { useTasks } from '../hooks/useTasks'
import { apiGenerateSummary } from '../api/tasks'

const FILTERS = ['all', 'to_do', 'in_progress', 'done']
const FILTER_LABELS = {
  all: 'All',
  to_do: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

function EmptyState({ filter }) {
  const msg =
    filter === 'all'
      ? "You don't have any tasks yet."
      : `No "${FILTER_LABELS[filter]}" tasks.`

  return (
    <div className="empty-state">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="12" width="48" height="42" rx="6" stroke="currentColor" strokeWidth="2.5" />
        <line x1="18" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="33" x2="40" y2="33" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="42" x2="34" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h3>{msg}</h3>
      <p>{filter === 'all' ? 'Create your first task to get started.' : ''}</p>
    </div>
  )
}

// Simple top-of-page toast
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="toast-container">
      <div className={`toast ${type}`}>{message}</div>
    </div>
  )
}

export function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, updateStatus, deleteTask } = useTasks()
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [shareTask, setShareTask] = useState(null)
  const [toast, setToast] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryPeriod, setSummaryPeriod] = useState('week')
  const [summaryText, setSummaryText] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState(null)

  async function handleGenerateSummary(period) {
    setSummaryPeriod(period)
    setSummaryLoading(true)
    setSummaryText(null)
    setSummaryError(null)
    setSummaryOpen(true)
    try {
      const text = await apiGenerateSummary(period)
      setSummaryText(text)
    } catch {
      setSummaryError('Failed to generate summary. Try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  function showToast(message, type = 'error') {
    setToast({ message, type })
  }

  const dismissToast = useCallback(() => setToast(null), [])

  async function handleSave(payload) {
    if (editTask) {
      return await updateTask(editTask.id, payload)
    } else {
      return await createTask(payload)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await updateStatus(id, status)
    } catch (err) {
      showToast(err?.response?.data?.detail ?? 'Status change failed')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTask(id)
    } catch {
      showToast('Failed to delete task')
    }
  }

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter)

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}

      <div className="page-container">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>My Tasks</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => handleGenerateSummary('day')}>✨ Today</button>
            <button className="btn btn-ghost" onClick={() => handleGenerateSummary('week')}>✨ This week</button>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New task</button>
          </div>
        </div>

        {/* AI Summary panel */}
        {summaryOpen && (
          <div style={{
            marginBottom: 20,
            padding: '16px 20px',
            borderRadius: 'var(--radius)',
            border: '1.5px solid var(--color-primary)',
            background: 'var(--color-primary-light)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>
                ✨ AI Summary — {summaryPeriod === 'day' ? 'Today' : 'This week'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  style={{ fontSize: '0.8125rem', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer' }}
                  onClick={() => handleGenerateSummary(summaryPeriod === 'day' ? 'week' : 'day')}
                  disabled={summaryLoading}
                >
                  Switch to {summaryPeriod === 'day' ? 'week' : 'today'}
                </button>
                <button onClick={() => setSummaryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text-muted)' }}>✕</button>
              </div>
            </div>
            {summaryLoading && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Generating summary…</p>}
            {summaryError && <p className="error-banner" style={{ margin: 0 }}>{summaryError}</p>}
            {summaryText && <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--color-text)' }}>{summaryText}</p>}
          </div>
        )}

        {/* Filter tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: filter === f ? 'var(--color-primary)' : 'var(--color-border)',
                background: filter === f ? 'var(--color-primary-light)' : 'transparent',
                color: filter === f ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                transition: 'all 150ms ease',
              }}
            >
              {FILTER_LABELS[f]}
              <span
                style={{
                  marginLeft: 6,
                  fontSize: '0.75rem',
                  opacity: 0.7,
                }}
              >
                {f === 'all' ? tasks.length : tasks.filter((t) => t.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <p className="error-banner" style={{ marginBottom: 16 }}>{error}</p>}

        {/* Loading */}
        {loading && (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 48 }}>
            Loading tasks…
          </p>
        )}

        {/* Task list */}
        {!loading && (
          filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={setEditTask}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onShare={setShareTask}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {(showCreate || editTask) && (
        <TaskModal
          task={editTask}
          onSave={handleSave}
          onClose={() => {
            setShowCreate(false)
            setEditTask(null)
            fetchTasks()
          }}
        />
      )}

      {shareTask && (
        <ShareModal task={shareTask} onClose={() => setShareTask(null)} />
      )}
    </>
  )
}
