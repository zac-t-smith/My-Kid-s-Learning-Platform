import BackButton from '../components/BackButton'
import StarBadge from '../components/StarBadge'
import NovaGuide from '../components/NovaGuide'
import { useProgress } from '../hooks/useProgress'

export default function Progress() {
  const { stars, visited } = useProgress()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <BackButton to="/" label="Back" />

      <h1 className="font-heading text-3xl font-bold text-cream mt-6 mb-6">
        ⭐ My Progress
      </h1>

      <div className="p-8 rounded-2xl bg-card border-2 border-gold/30 text-center mb-6">
        <div className="mb-4">
          <StarBadge count={stars} />
        </div>
        <p className="font-body text-lg text-cream mb-2">
          {stars === 0
            ? "Start learning to earn your first stars!"
            : `Amazing! You've earned ${stars} star${stars !== 1 ? 's' : ''}!`}
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-card border-2 border-mint/30">
        <h2 className="font-heading text-xl font-bold text-mint mb-3">
          Topics Explored
        </h2>
        {visited.length === 0 ? (
          <p className="font-body text-sm text-cream/70">
            You haven't explored any topics yet. Go check one out!
          </p>
        ) : (
          <ul className="space-y-2">
            {visited.map(id => (
              <li key={id} className="flex items-center gap-2 font-body text-cream">
                <span className="text-success">✓</span>
                <span className="capitalize">{id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-center">
        <NovaGuide message="Every step forward is progress! I'm so proud of you! 🌈" />
      </div>
    </div>
  )
}
