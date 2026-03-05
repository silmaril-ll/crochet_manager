import styles from './ProjectGrid.module.css'

const STATUS_LABEL = {
  'in-progress': '进行中',
  'completed': '已完成',
  'paused': '暂停中',
}

const STATUS_COLOR = {
  'in-progress': '#B4916C',
  'completed': '#6B9E78',
  'paused': '#9E9589',
}

export default function ProjectGrid({ projects, onOpen, onDelete, emptyMessage }) {
  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🧶</span>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={() => onOpen(project.id)}
          onDelete={onDelete ? () => onDelete(project.id) : null}
        />
      ))}
    </div>
  )
}

function ProjectCard({ project, onOpen, onDelete }) {
  const tags = project.tags || []
  const status = project.status || 'in-progress'

  return (
    <div className={styles.card} onClick={onOpen}>
      <div className={styles.thumbnail}>
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.name} className={styles.img} />
        ) : (
          <div className={styles.placeholder}>
            <span>🧶</span>
          </div>
        )}
        <div
          className={styles.statusBadge}
          style={{ background: STATUS_COLOR[status] }}
        >
          {STATUS_LABEL[status]}
        </div>
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{project.name}</h3>
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 3).map(t => (
              <span key={t} className={styles.tag}>{t}</span>
            ))}
          </div>
        )}
        {project.hook_size && (
          <p className={styles.meta}>钩针 {project.hook_size}mm</p>
        )}
      </div>

      {onDelete && (
        <button
          className={styles.deleteBtn}
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="删除"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="5" y1="5" x2="15" y2="15"/>
            <line x1="15" y1="5" x2="5" y2="15"/>
          </svg>
        </button>
      )}
    </div>
  )
}
