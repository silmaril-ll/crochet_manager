import { useState } from 'react'
import AuthModal from '../auth/AuthModal'
import styles from './AuthDot.module.css'

export default function AuthDot({ user, onSignIn, onSignOut }) {
  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  if (user) {
    return (
      <div className={styles.wrapper}>
        <button
          className={`${styles.dot} ${styles.dotSigned}`}
          onClick={() => setShowMenu(v => !v)}
          title={user.email}
        />
        {showMenu && (
          <div className={styles.menu}>
            <div className={styles.menuEmail}>{user.email}</div>
            <button className={styles.menuItem} onClick={() => { onSignOut(); setShowMenu(false) }}>
              退出登录
            </button>
          </div>
        )}
        {showMenu && <div className={styles.backdrop} onClick={() => setShowMenu(false)} />}
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.dot}
        onClick={() => setShowModal(true)}
        title="登录"
      />
      {showModal && (
        <AuthModal
          onSignIn={onSignIn}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
