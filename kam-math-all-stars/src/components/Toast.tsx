import { useEffect, useState } from 'react'

let push: (t: string) => void = () => {}
export const toast = (t: string) => push(t)

export function ToastHost() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    push = (t) => {
      setMsg(t)
      clearTimeout(timer)
      timer = setTimeout(() => setMsg(''), 2200)
    }
    return () => clearTimeout(timer)
  }, [])
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null
}
