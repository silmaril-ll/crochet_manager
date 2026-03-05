import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './CounterPanel.module.css'

export default function CounterPanel({ projectId, user }) {
  const [counters, setCounters] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('counters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    if (data) setCounters(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  async function addCounter() {
    const name = newName.trim() || `计数器 ${counters.length + 1}`
    const { data } = await supabase
      .from('counters')
      .insert({ project_id: projectId, name, count: 0 })
      .select()
      .single()
    if (data) {
      setCounters(prev => [...prev, data])
      setNewName('')
      setAdding(false)
    }
  }

  async function updateCount(id, delta) {
    setCounters(prev => prev.map(c =>
      c.id === id ? { ...c, count: Math.max(0, c.count + delta) } : c
    ))
    const counter = counters.find(c => c.id === id)
    const newCount = Math.max(0, counter.count + delta)
    await supabase.from('counters').update({ count: newCount }).eq('id', id)
  }

  async function resetCounter(id) {
    if (!confirm('重置计数为 0？')) return
    setCounters(prev => prev.map(c => c.id === id ? { ...c, count: 0 } : c))
    await supabase.from('counters').update({ count: 0 }).eq('id', id)
  }

  async function deleteCounter(id) {
    if (!confirm('删除该计数器？')) return
    setCounters(prev => prev.filter(c => c.id !== id))
    await supabase.from('counters').delete().eq('id', id)
  }

  if (loading) return <div className={styles.loading}>加载中…</div>

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {counters.length === 0 && (
          <div className={styles.empty}>还没有计数器</div>
        )}
        {counters.map(counter => (
          <div key={counter.id} className={styles.counter}>
            <div className={styles.counterName}>{counter.name}</div>
            <div className={styles.counterBody}>
              <div className={styles.number}>{counter.count}</div>
              <div className={styles.btns}>
                <button className={styles.countBtn} onClick={() => updateCount(counter.id, -1)}>
                  −
                </button>
                <button className={styles.countBtn} onClick={() => resetCounter(counter.id)}>
                  ↺
                </button>
                <button className={styles.countBtn} onClick={() => updateCount(counter.id, 1)}>
                  +
                </button>
              </div>
            </div>
            {user && (
              <button className={styles.deleteBtn} onClick={() => deleteCounter(counter.id)}>
                删除
              </button>
            )}
          </div>
        ))}
      </div>

      {user && (
        <div className={styles.addSection}>
          {adding ? (
            <div className={styles.addForm}>
              <input
                className={styles.addInput}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={`计数器 ${counters.length + 1}`}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && addCounter()}
              />
              <button className={styles.addConfirm} onClick={addCounter}>添加</button>
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
