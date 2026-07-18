import BackButton from '../components/BackButton'
import NovaGuide from '../components/NovaGuide'

export default function Spelling() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <BackButton to="/" label="Back" />

      <h1 className="font-heading text-3xl font-bold text-cream mt-6 mb-4">
        🔤 Spelling Adventures
      </h1>

      <div className="p-8 rounded-2xl bg-card border-2 border-mint/30 text-center">
        <p className="font-body text-lg text-cream mb-4">
          Word adventures are coming soon!
        </p>
        <p className="font-body text-sm text-cream/70">
          We'll practice spelling with fun games and stories.
        </p>
      </div>

      <div className="flex justify-center">
        <NovaGuide message="Words are like puzzles — let's figure them out together! 🧩" />
      </div>
    </div>
  )
}
