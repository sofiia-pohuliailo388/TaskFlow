import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from '../styles/Navbar.module.css'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/tasks" className={styles.logo}>
          TaskFlow
        </Link>

        <button
          className={`${styles.hamburger} ${open ? styles.open : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`${styles.nav} ${open ? styles.open : ''}`}>
          <span className={styles.userInfo}>{user.name ?? user.email}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
