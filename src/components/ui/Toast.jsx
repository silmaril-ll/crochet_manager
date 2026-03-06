import { useRef, useState } from 'react'
import styles from './Toast.module.css'

export function useToast() {
  const [message, setMessage] = useState(null)
  const timer = useRef()

  function showError(msg) {
    clearTimeout(timer.current)
    setMessage(msg)
    timer.current = setTimeout(() => setMessage(null), 3000)
  }

  return { toastMessage: message, showError }
}

export function Toast({ message }) {
  if (!message) return null
  return <div className={styles.toast}>{message}</div>
}
