import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadToCloudinary } from '../../lib/cloudinary'
import ReadingLine from './ReadingLine'
import ImageAnnotations from './ImageAnnotations'
import styles from './PatternViewer.module.css'

function compressImage(file, maxKB = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        const maxPx = 2400
        if (width > maxPx || height > maxPx) {
          const ratio = Math.min(maxPx / width, maxPx / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        let quality = 0.88
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size > maxKB * 1024 && quality > 0.4) {
              quality -= 0.1
              tryCompress()
            } else {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            }
          }, 'image/jpeg', quality)
        }
        tryCompress()
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const PatternViewer = forwardRef(function PatternViewer(
  {
    projectId, user,
    showReadingLine,
    activeImg, onActiveImgChange, onImagesLoaded, onUploadingChange,
    annotationMode,
  },
  ref
) {
  const [images, setImages] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(null)
  const [imgScale, setImgScale] = useState(1)
  const dragIndexRef = useRef(null)
  const pinchRef = useRef(null)
  const imgScaleRef = useRef(1)
  const imgWrapperRef = useRef()
  const lastTapRef = useRef(0)
  const fileRef = useRef()

  useImperativeHandle(ref, () => ({
    triggerUpload: () => fileRef.current?.click(),
  }))

  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from('pattern_files')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
    if (data) {
      const imgs = data.filter(f => f.file_type === 'image')
      const pdfList = data.filter(f => f.file_type === 'pdf')
      setImages(imgs)
      setPdfs(pdfList)
      onImagesLoaded?.(imgs.length)
    }
    setLoading(false)
  }, [projectId, onImagesLoaded])

  useEffect(() => { loadFiles() }, [loadFiles])

  // Reset scale when switching images
  useEffect(() => {
    setImgScale(1)
    imgScaleRef.current = 1
  }, [activeImg])

  // Pinch-to-zoom (re-run after loading so imgWrapperRef is set)
  useEffect(() => {
    const el = imgWrapperRef.current
    if (!el) return
    function getTouchDist(t) {
      const dx = t[0].clientX - t[1].clientX
      const dy = t[0].clientY - t[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
    function onTouchStart(e) {
      if (e.touches.length === 2)
        pinchRef.current = { startDist: getTouchDist(e.touches), startScale: imgScaleRef.current }
    }
    function onTouchMove(e) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const newScale = Math.min(5, Math.max(1,
          pinchRef.current.startScale * getTouchDist(e.touches) / pinchRef.current.startDist))
        setImgScale(newScale)
        imgScaleRef.current = newScale
      }
    }
    function onTouchEnd(e) {
      if (e.touches.length < 2) {
        pinchRef.current = null
        if (e.changedTouches.length === 1) {
          const now = Date.now()
          if (now - lastTapRef.current < 300) { setImgScale(1); imgScaleRef.current = 1 }
          lastTapRef.current = now
        }
      }
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [loading])

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    onUploadingChange?.(true)

    const isFirstImage = images.length === 0

    for (const file of files) {
      const isPdf = file.type === 'application/pdf'
      try {
        const uploadFile = isPdf ? file : await compressImage(file)
        const { secureUrl, publicId } = await uploadToCloudinary(uploadFile)

        await supabase.from('pattern_files').insert({
          project_id: projectId,
          url: secureUrl,
          storage_path: publicId,
          file_type: isPdf ? 'pdf' : 'image',
          sort_order: Date.now(),
        })

        if (isFirstImage && !isPdf) {
          await supabase.from('projects')
            .update({ thumbnail_url: secureUrl })
            .eq('id', projectId)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    await loadFiles()
    onUploadingChange?.(false)
    e.target.value = ''
  }

  async function handleDelete(file) {
    await supabase.from('pattern_files').delete().eq('id', file.id)
    onActiveImgChange?.(0)
    await loadFiles()
  }

  // Move image to first position and update project thumbnail
  async function handleSetThumbnail(file) {
    const idx = images.findIndex(img => img.id === file.id)
    if (idx <= 0) return
    const newImages = [...images]
    newImages.splice(idx, 1)
    newImages.unshift(file)
    setImages(newImages)
    onActiveImgChange?.(0)
    await Promise.all([
      ...newImages.map((img, i) =>
        supabase.from('pattern_files').update({ sort_order: (i + 1) * 1000 }).eq('id', img.id)
      ),
      supabase.from('projects').update({ thumbnail_url: file.url }).eq('id', projectId),
    ])
  }

  // Drag reorder handlers
  function handleDragStart(e, index) {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(index)
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  async function handleDrop(e, index) {
    e.preventDefault()
    setDragOver(null)
    const from = dragIndexRef.current
    if (from === null || from === index) return
    dragIndexRef.current = null

    const newImages = [...images]
    const [moved] = newImages.splice(from, 1)
    newImages.splice(index, 0, moved)
    setImages(newImages)

    // Keep activeImg tracking the same image
    let newActive = activeImg
    if (activeImg === from) newActive = index
    else if (from < activeImg && index >= activeImg) newActive = activeImg - 1
    else if (from > activeImg && index <= activeImg) newActive = activeImg + 1
    onActiveImgChange?.(newActive)

    await Promise.all(
      newImages.map((img, i) =>
        supabase.from('pattern_files').update({ sort_order: (i + 1) * 1000 }).eq('id', img.id)
      )
    )
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDragOver(null)
  }

  if (loading) return <div className={styles.empty}>加载中…</div>

  const currentImg = images[activeImg] ?? images[0]
  const hasMultiple = images.length > 1

  return (
    <div className={`${styles.viewer} ${hasMultiple ? styles.viewerWithStrip : ''}`}>
      {/* PDF list */}
      {pdfs.length > 0 && (
        <div className={styles.pdfList}>
          {pdfs.map(pdf => (
            <div key={pdf.id} className={styles.pdfItem}>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer" className={styles.pdfLink}>
                📄 {decodeURIComponent(pdf.url.split('/').pop().split('?')[0])}
              </a>
              {user && (
                <button className={styles.removeBtn} onClick={() => handleDelete(pdf)}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image viewer */}
      <div className={styles.imageArea}>
        {images.length > 0 ? (
          <div className={styles.mainImg}>
            <div className={styles.imgWrapper} ref={imgWrapperRef}>
              <img
                key={currentImg?.id}
                src={currentImg?.url}
                alt="图解"
                className={styles.patternImg}
                style={imgScale !== 1 ? { width: `${imgScale * 100}%` } : undefined}
              />
              {showReadingLine && <ReadingLine projectId={projectId} />}
              <ImageAnnotations
                projectId={projectId}
                pageIndex={activeImg}
                annotationMode={annotationMode}
                user={user}
              />
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <span>暂无图解</span>
            <span className={styles.emptyHint}>点击下方上传按钮添加</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip + action buttons */}
      {hasMultiple && (
        <div className={styles.thumbStrip}>
          <div className={styles.thumbScrollArea}>
            {images.map((img, i) => (
              <div
                key={img.id}
                data-thumb-index={i}
                className={[
                  styles.thumbItem,
                  i === activeImg ? styles.thumbActive : '',
                  dragOver === i ? styles.thumbDragOver : '',
                ].join(' ')}
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={e => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                onClick={() => onActiveImgChange?.(i)}
              >
                <img src={img.url} className={styles.thumbImg} alt={`图解 ${i + 1}`} draggable={false} />
                {i === 0 && <span className={styles.thumbBadge}>封面</span>}
              </div>
            ))}
          </div>
          {user && currentImg && (
            <div className={styles.thumbActions}>
              {activeImg > 0 && (
                <button className={styles.thumbActionSetMain} onClick={() => handleSetThumbnail(currentImg)}>
                  设为主图
                </button>
              )}
              <button className={styles.thumbActionDelete} onClick={() => handleDelete(currentImg)}>
                删除
              </button>
            </div>
          )}
        </div>
      )}
      {/* Single-image delete button (fixed, above toolbar) */}
      {!hasMultiple && user && currentImg && (
        <div className={styles.singleImgActions}>
          <button className={styles.thumbActionDelete} onClick={() => handleDelete(currentImg)}>
            删除
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className={styles.fileInput}
        onChange={handleUpload}
      />
    </div>
  )
})

export default PatternViewer
