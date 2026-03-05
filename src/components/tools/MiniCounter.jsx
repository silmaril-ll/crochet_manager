import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './MiniCounter.module.css'

// Shows the first 2 counters pinned above the pattern image.
// Auto-creates "行" and "针" defaults if the project has no counters yet.
export default function MiniCounter({ projectId, user }) {
  const [counters, setCounters] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('counters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (data && data.length === 0) {
      // Auto-create default "行" and "针" counters
      const { data: created } = await supabase
        .from('counters')
        .insert([
          { project_id: projectId, name: '行', count: 0 },
          { project_id: projectId, name: '针', count: 0 },
        ])
        .select()
      setCounters(created || [])
    } else {
      setCounters((data || []).slice(0, 2))
    }
    setReady(true)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function updateCount(id, delta) {
    setCounters(prev => prev.map(c =>
      c.id === id ? { ...c, count: Math.max(0, c.count + delta) } : c
    ))
    const counter = counters.find(c => c.id === id)
    const newCount = Math.max(0, counter.count + delta)
    await supabase.from('counters').update({ count: newCount }).eq('id', id)
  }

  async function resetCounter(id) {
    setCounters(prev => prev.map(c => c.id === id ? { ...c, count: 0 } : c))
    await supabase.from('counters').update({ count: 0 }).eq('id', id)
  }

  async function saveName(id) {
    const name = editName.trim()
    setEditingId(null)
    if (!name) return
    setCounters(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    await supabase.from('counters').update({ name }).eq('id', id)
  }

  if (!ready || counters.length === 0) return null

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
                onBlur={() => saveName(counter.id)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(counter.id) }}
                autoFocus
              />
            ) : (
              <button
                className={styles.name}
                onClick={() => {
                  if (user) { setEditingId(counter.id); setEditName(counter.name) }
                }}
                title={user ? '点击重命名' : counter.name}
              >
                {counter.name}
              </button>
            )}
          </div>

          <div className={styles.controls}>
            <button
              className={styles.btn}
              onClick={() => updateCount(counter.id, -1)}
              disabled={counter.count === 0}
            >−</button>
            <button
              className={styles.count}
              onClick={() => resetCounter(counter.id)}
              title="归零"
            >
              {counter.count}
            </button>
            <button
              className={`${styles.btn} ${styles.btnPlus}`}
              onClick={() => updateCount(counter.id, 1)}
            >+</button>
          </div>
        </div>
      ))}
    </div>
  )
}
