import SubjectCard from '../components/SubjectCard'
import StarBadge from '../components/StarBadge'
import NovaGuide from '../components/NovaGuide'
import { useProgress } from '../hooks/useProgress'

export default function Home() {
  const { stars } = useProgress()

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-cream mb-3">
          Welcome back, Kailynn! ⭐
        </h1>
        <StarBadge count={stars} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <SubjectCard
          emoji="🔢"
          title="Math"
          subtitle="Numbers & puzzles"
          to="/math"
        />
        <SubjectCard
          emoji="🔤"
          title="Spelling"
          subtitle="Word adventures"
          to="/spelling"
        />
        <SubjectCard
          emoji="📖"
          title="Reading"
          subtitle="Story time"
          to="/reading"
        />
        <SubjectCard
          emoji="⭐"
          title="My Progress"
          subtitle="See your stars"
          to="/progress"
        />
      </div>

      <div className="flex justify-center">
        <NovaGuide />
      </div>
    </div>
  )
}
