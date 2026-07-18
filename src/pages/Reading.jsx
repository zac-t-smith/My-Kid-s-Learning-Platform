import BackButton from '../components/BackButton'
import NovaGuide from '../components/NovaGuide'

export default function Reading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <BackButton to="/" label="Back" />

      <h1 className="font-heading text-3xl font-bold text-cream mt-6 mb-4">
        📖 Story Time
      </h1>

      <div className="p-8 rounded-2xl bg-card border-2 border-coral/30 text-center">
        <p className="font-body text-lg text-cream mb-4">
          Stories and reading practice coming soon!
        </p>
        <p className="font-body text-sm text-cream/70">
          We'll read together at your own pace.
        </p>
      </div>

      <div className="flex justify-center">
        <NovaGuide message="Every great adventure starts with opening a book! 📚" />
      </div>
    </div>
  )
}
