import { BrowserRouter, Routes, Route, useMatch } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthDot from './components/layout/AuthDot'
import BottomNav from './components/layout/BottomNav'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'
import YarnPage from './pages/YarnPage'
import styles from './App.module.css'

function AppContent({ user, signIn, signOut }) {
  const isProject = useMatch('/project/:id')
  return (
    <div className={styles.app}>
      {!isProject && (
        <header className={styles.header}>
          <span className={styles.logo}>Yarn Nest</span>
          <AuthDot user={user} onSignIn={signIn} onSignOut={signOut} />
        </header>
      )}

      <main className={`${styles.main} ${isProject ? styles.mainProject : ''}`}>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/project/:id" element={<ProjectPage user={user} />} />
          <Route path="/yarn" element={<YarnPage user={user} />} />
        </Routes>
      </main>

      {!isProject && <BottomNav />}
    </div>
  )
}

export default function App() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) {
    return (
      <div className={styles.splash}>
        <div className={styles.splashDot} />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppContent user={user} signIn={signIn} signOut={signOut} />
    </BrowserRouter>
  )
}
