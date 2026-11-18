import { useEffect, useRef } from 'react'

/** Big number pad. Also listens to a real keyboard (handy with an iPad keyboard case). */
export default function NumPad({ onKey, goLabel = 'Check', goIcon = '✔', extra }: { onKey: (k: string) => void; goLabel?: string; goIcon?: string; extra?: { key: string; label: string; aria: string } }) {
  const cb = useRef(onKey)
  cb.current = onKey
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (/^[0-9]$/.test(e.key)) cb.current(e.key)
      else if (e.key === 'Backspace') cb.current('del')
      else if (e.key === 'Enter') cb.current('go')
      else if (e.key === '.' || e.key === '/' || e.key === '-') cb.current(e.key)
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])
  return (
    <div className="pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button key={n} onClick={() => onKey(String(n))}>
          {n}
        </button>
      ))}
      <button className="del" aria-label="Delete" onClick={() => onKey('del')}>
        ⌫
      </button>
      <button onClick={() => onKey('0')}>0</button>
      <button className="go" aria-label={goLabel} onClick={() => onKey('go')}>
        {goIcon}
      </button>
      {extra && (
        <button className="del" style={{ gridColumn: 'span 3' }} aria-label={extra.aria} onClick={() => onKey(extra.key)}>
          {extra.label}
        </button>
      )}
    </div>
  )
}
