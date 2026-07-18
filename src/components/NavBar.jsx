import { Link } from 'react-router-dom'

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <span className="font-heading text-xl font-bold text-gold">
        🧙‍♀️ Kailynn's World
      </span>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy text-cream font-body text-base font-bold hover:bg-gold hover:text-navy transition-colors min-h-12"
      >
        🏠 Home
      </Link>
    </nav>
  )
}
