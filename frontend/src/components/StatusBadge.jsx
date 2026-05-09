import PropTypes from 'prop-types'

const STATUS_LABELS = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const STATUS_STYLES = {
  to_do: { background: 'var(--color-to-do-bg)', color: 'var(--color-to-do)' },
  in_progress: { background: 'var(--color-in-progress-bg)', color: 'var(--color-in-progress)' },
  done: { background: 'var(--color-done-bg)', color: 'var(--color-done)' },
}

const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_STYLES = {
  high: { background: 'var(--color-priority-high-bg)', color: 'var(--color-priority-high)' },
  medium: { background: 'var(--color-priority-medium-bg)', color: 'var(--color-priority-medium)' },
  low: { background: 'var(--color-priority-low-bg)', color: 'var(--color-priority-low)' },
}

const badgeBase = {
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '0.8rem',
  fontWeight: 600,
  display: 'inline-block',
  lineHeight: 1.5,
}

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.to_do
  return (
    <span style={{ ...badgeBase, ...style }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium
  return (
    <span style={{ ...badgeBase, ...style, fontSize: '0.75rem' }}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  )
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['to_do', 'in_progress', 'done']).isRequired,
}

PriorityBadge.propTypes = {
  priority: PropTypes.oneOf(['high', 'medium', 'low']).isRequired,
}
