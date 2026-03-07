import { useState, useRef } from 'react'
import styles from './CounterPanel.module.css'

// Purely presentational — all state and DB ops are owned by ProjectPage.
export default function CounterPanel({
  counters = [],
  onIncrement, onDecrement, onReset, onAdd, onDelete, onRename,
  maxCounters = 3,
  user,
}) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const confirmTimer = useRef()

  function startEdit(counter) {
    setEditingId(counter.id)
    setEditName(counter.name)
  }

  function commitEdit(id) {
    onRename?.(id, editName)
    setEditingId(null)
  }

  async function handleAdd() {
    await onAdd?.(newName.trim())
    setNewName('')
    setAdding(false)
  }

  function handleResetClick(counterId) {
    if (confirmingId === counterId) {
      clearTimeout(confirmTimer.current)
      setConfirmingId(null)
      onReset?.(counterId)
    } else {
      clearTimeout(confirmTimer.current)
      setConfirmingId(counterId)
      confirmTimer.current = setTimeout(() => setConfirmingId(null), 2500)
    }
  }

  const atMax = counters.length >= maxCounters

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {counters.length === 0 && (
          <div className={styles.empty}>还没有计数器</div>
        )}

        {counters.map(counter => (
          <div key={counter.id} className={styles.counter}>
            {editingId === counter.id ? (
              <input
                className={styles.nameEditInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => commitEdit(counter.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(counter.id) }}
                autoFocus
              />
            ) : (
              <div
                className={styles.counterName}
                onClick={() => user && startEdit(counter)}
                title={user ? '点击重命名' : undefined}
                style={{ cursor: user ? 'text' : 'default' }}
              >
                {counter.name}
              </div>
            )}

            <div className={styles.counterBody}>
              <div className={styles.number}>{counter.count}</div>
              <div className={styles.btns}>
                <button className={styles.countBtn} onClick={() => onDecrement?.(counter.id)}>−</button>
                <button
                  className={`${styles.countBtn} ${confirmingId === counter.id ? styles.countBtnConfirm : ''}`}
                  onClick={() => handleResetClick(counter.id)}
                  title={confirmingId === counter.id ? '再次点击确认归零' : '归零'}
                >
                  {confirmingId === counter.id ? '?' : '↺'}
                </button>
                <button className={styles.countBtn} onClick={() => onIncrement?.(counter.id)}>+</button>
              </div>
            </div>

            {user && (
              <button className={styles.deleteBtn} onClick={() => onDelete?.(counter.id)}>
                删除
              </button>
            )}
          </div>
        ))}
      </div>

      {user && (
        <div className={styles.addSection}>
          {atMax ? (
            <p className={styles.maxHint}>最多 {maxCounters} 个计数器</p>
          ) : adding ? (
            <div className={styles.addForm}>
              <input
                className={styles.addInput}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={`计数器 ${counters.length + 1}`}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <button className={styles.addConfirm} onClick={handleAdd}>添加</button>
              <button className={styles.addCancel} onClick={() => setAdding(false)}>取消</button>
            </div>
          ) : (
            <button className={styles.addBtn} onClick={() => setAdding(true)}>
              + 添加计数器
            </button>
          )}
        </div>
      )}
    </div>
  )
}
