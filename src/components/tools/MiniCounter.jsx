import { useState } from 'react'
import styles from './MiniCounter.module.css'

// Purely presentational — state is owned by ProjectPage.
export default function MiniCounter({ counters, onIncrement, onDecrement, onReset, onRename, user }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  if (!counters || counters.length === 0) return null

  function startEdit(counter) {
    if (!user) return
    setEditingId(counter.id)
    setEditName(counter.name)
  }

  function commitEdit(id) {
    onRename?.(id, editName)
    setEditingId(null)
  }

  return (
    <div className={styles.strip}>
      {counters.map(counter => (
        <div key={counter.id} className={styles.item}>
          <div className={styles.label}>
            {editingId === counter.id ? (
              <input
                className={styles.nameInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => commitEdit(counter.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(counter.id) }}
                autoFocus
              />
            ) : (
              <button
                className={styles.name}
                onClick={() => startEdit(counter)}
                title={user ? '点击重命名' : counter.name}
              >
                {counter.name}
              </button>
            )}
          </div>

          <div className={styles.controls}>
            <button
              className={styles.btn}
              onClick={() => onDecrement?.(counter.id)}
              disabled={counter.count === 0}
            >−</button>
            <button
              className={styles.count}
              onClick={() => onReset?.(counter.id)}
              title="点击归零"
            >
              {counter.count}
            </button>
            <button
              className={`${styles.btn} ${styles.btnPlus}`}
              onClick={() => onIncrement?.(counter.id)}
            >+</button>
          </div>
        </div>
      ))}
    </div>
  )
}
