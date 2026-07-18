import { useState, useEffect } from 'react'

const tips = [
  "You're doing amazing! Keep going! 🌟",
  "Every mistake helps you learn something new! 💪",
  "Take your time — there's no rush! 🐢",
  "You're braver than you believe! 🦁",
  "Practice makes progress, not perfect! 🎯",
]

export default function NovaGuide({ message }) {
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    if (message) return
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % tips.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [message])

  const displayMessage = message || tips[tipIndex]

  return (
    <div className="flex items-end gap-3 mt-8" style={{ animation: 'float 3s ease-in-out infinite' }}>
      <span className="text-4xl">🧙‍♀️</span>
      <div className="relative px-5 py-3 rounded-2xl bg-card border-2 border-lavender/40 max-w-xs">
        <p className="font-body text-sm text-cream">{displayMessage}</p>
        <div className="absolute -left-2 bottom-3 w-3 h-3 bg-card border-l-2 border-b-2 border-lavender/40 rotate-45" />
      </div>
    </div>
  )
}
