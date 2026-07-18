import { Link } from 'react-router-dom'

export default function BackButton({ to, label = 'Back' }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border-2 border-mint/40 text-cream font-body text-base font-bold hover:bg-mint hover:text-navy transition-colors min-h-12"
    >
      ← {label}
    </Link>
  )
}
