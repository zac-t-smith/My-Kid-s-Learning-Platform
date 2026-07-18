import { useEffect } from 'react'
import BackButton from '../components/BackButton'
import NovaGuide from '../components/NovaGuide'
import { useProgress } from '../hooks/useProgress'

export default function Division() {
  const { markVisited } = useProgress()

  useEffect(() => {
    markVisited('division')
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <BackButton to="/math" label="Back" />

      <h1 className="font-heading text-3xl font-bold text-cream mt-6 mb-4">
        ➗ Long Division
      </h1>

      <div className="p-8 rounded-2xl bg-card border-2 border-gold/30 text-center">
        <p className="font-body text-lg text-cream mb-4">
          Content coming soon!
        </p>
        <p className="font-body text-sm text-cream/70">
          This is where division lessons and practice will live.
        </p>
      </div>

      <div className="flex justify-center">
        <NovaGuide message="Division is all about sharing equally! We'll practice together soon. 🎉" />
      </div>
    </div>
  )
}
