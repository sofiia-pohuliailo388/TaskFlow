import PropTypes from 'prop-types'

const LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
}

const STYLES = {
  pending: {
    background: 'var(--color-pending-bg)',
    color: 'var(--color-pending)',
  },
  in_progress: {
    background: 'var(--color-in-progress-bg)',
    color: 'var(--color-in-progress)',
  },
  done: {
    background: 'var(--color-done-bg)',
    color: 'var(--color-done)',
  },
}

export function StatusBadge({ status }) {
  const style = STYLES[status] ?? STYLES.pending
  return (
    <span
      style={{
        ...style,
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: 600,
        display: 'inline-block',
        lineHeight: 1.5,
      }}
    >
      {LABELS[status] ?? status}
    </span>
  )
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['pending', 'in_progress', 'done']).isRequired,
}
