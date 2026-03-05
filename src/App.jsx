import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AuthDot from './components/layout/AuthDot'
import BottomNav from './components/layout/BottomNav'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'
import YarnPage from './pages/YarnPage'
import styles from './App.module.css'

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
      <div className={styles.app}>
        <header className={styles.header}>
          <span className={styles.logo}>毛线助手</span>
          <AuthDot user={user} onSignIn={signIn} onSignOut={signOut} />
        </header>

        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/project/:id" element={<ProjectPage user={user} />} />
            <Route path="/yarn" element={<YarnPage user={user} />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
