import { Link } from 'react-router-dom'

export default function SubjectCard({ emoji, title, subtitle, to, locked = false }) {
  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-card/50 border-2 border-lavender/30 opacity-60 min-h-40 cursor-not-allowed">
        <span className="text-4xl">🔒</span>
        <h3 className="font-heading text-lg text-lavender">{title}</h3>
        <p className="font-body text-sm text-cream/60">Coming Soon</p>
      </div>
    )
  }

  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-card border-2 border-gold/30 min-h-40 transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(245,166,35,0.3)] hover:border-gold/60 active:scale-95"
    >
      <span className="text-4xl">{emoji}</span>
      <h3 className="font-heading text-xl font-bold text-cream">{title}</h3>
      <p className="font-body text-sm text-cream/80">{subtitle}</p>
    </Link>
  )
}
