import { useState, useRef } from 'react'
import { useTasks } from '../hooks/useTasks'
import { TaskModal } from '../components/TaskModal'
import { PriorityBadge } from '../components/StatusBadge'
import styles from '../styles/KanbanPage.module.css'

const COLUMNS = [
  { id: 'to_do', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

const ALLOWED_TRANSITIONS = {
  to_do: ['in_progress'],
  in_progress: ['to_do', 'done'],
  done: [],
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(iso, status) {
  if (!iso || status === 'done') return false
  return new Date(iso) < new Date()
}

function KanbanCard({ task, onEdit, onDragStart }) {
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div
      className={styles.card}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
      title="Click to edit"
    >
      <div className={styles.cardTitle}>{task.title}</div>
      {task.description && <p className={styles.cardDesc}>{task.description}</p>}
      <div className={styles.cardMeta}>
        <PriorityBadge priority={task.priority ?? 'medium'} />
        {task.due_date && (
          <span className={`${styles.cardDate} ${overdue ? styles.overdue : ''}`}>
            {overdue ? '⚠ ' : ''}Due {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ column, tasks, onDrop, onDragOver, onDragLeave, dragOverCol, onEdit, onDragStart }) {
  const isOver = dragOverCol === column.id

  return (
    <div
      className={`${styles.column} ${isOver ? styles.dragOver : ''}`}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      <div className={styles.columnHeader}>
        <span className={`${styles.columnTitle} ${styles[column.id]}`}>{column.label}</span>
        <span className={styles.count}>{tasks.length}</span>
      </div>
      <div className={styles.cards}>
        {tasks.length === 0 ? (
          <div className={styles.emptyCol}>No tasks</div>
        ) : (
          tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onEdit={onEdit} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  )
}

export function KanbanPage() {
  const { tasks, loading, error, updateStatus, createTask, updateTask } = useTasks()
  const [dragOverCol, setDragOverCol] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const draggedId = useRef(null)

  function handleDragStart(e, taskId) {
    draggedId.current = taskId
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(colId)
  }

  function handleDragLeave() {
    setDragOverCol(null)
  }

  async function handleDrop(e, targetStatus) {
    e.preventDefault()
    setDragOverCol(null)
    const id = draggedId.current
    draggedId.current = null
    if (!id) return

    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === targetStatus) return

    const allowed = ALLOWED_TRANSITIONS[task.status] ?? []
    if (!allowed.includes(targetStatus)) return

    await updateStatus(id, targetStatus)
  }

  async function handleSave(payload) {
    if (editTask) {
      await updateTask(editTask.id, payload)
    } else {
      await createTask(payload)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: 48 }}>
          Loading…
        </p>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Kanban Board</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New task</button>
      </div>

      {error && <p className="error-banner" style={{ marginBottom: 16 }}>{error}</p>}

      <div className={styles.board}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.status === col.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            dragOverCol={dragOverCol}
            onEdit={setEditTask}
          />
        ))}
      </div>

      {(showCreate || editTask) && (
        <TaskModal
          task={editTask}
          onSave={handleSave}
          onClose={() => { setShowCreate(false); setEditTask(null) }}
        />
      )}
    </div>
  )
}
