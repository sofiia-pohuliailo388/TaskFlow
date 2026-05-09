import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { TasksPage } from './pages/TasksPage'
import { KanbanPage } from './pages/KanbanPage'
import { SharePage } from './pages/SharePage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kanban"
            element={
              <ProtectedRoute>
                <KanbanPage />
              </ProtectedRoute>
            }
          />
          <Route path="/share/:token" element={<SharePage />} />
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
