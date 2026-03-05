import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const ICON_PROJECTS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
)

const ICON_YARN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.5 3-2.5 6 0 9s2.5 6 0 9M12 3c2.5 3 2.5 6 0 9s-2.5 6 0 9"/>
  </svg>
)

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" end className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}>{ICON_PROJECTS}</span>
        <span className={styles.label}>项目</span>
      </NavLink>
      <NavLink to="/yarn" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon}>{ICON_YARN}</span>
        <span className={styles.label}>线材</span>
      </NavLink>
    </nav>
  )
}
