import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 8) errs.password = 'Minimum 8 characters'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    setApiError(null)
    try {
      await register(name, email, password)
      navigate('/tasks', { replace: true })
    } catch (err) {
      setApiError(err?.response?.data?.detail ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function field(id, label, type, value, setter, key) {
    return (
      <div className="form-group">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            setter(e.target.value)
            if (errors[key]) setErrors((p) => ({ ...p, [key]: null }))
          }}
          className={errors[key] ? 'error' : ''}
          autoComplete={type === 'password' ? 'new-password' : id}
        />
        {errors[key] && <span className="field-error">{errors[key]}</span>}
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="subtitle">Get started with TaskFlow</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {apiError && <p className="error-banner">{apiError}</p>}

          {field('name', 'Full name', 'text', name, setName, 'name')}
          {field('email', 'Email', 'email', email, setEmail, 'email')}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((p) => ({ ...p, password: null }))
              }}
              className={errors.password ? 'error' : ''}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
