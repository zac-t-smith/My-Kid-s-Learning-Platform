import SubjectCard from '../components/SubjectCard'
import BackButton from '../components/BackButton'

const topics = [
  { id: 'division', emoji: '➗', title: 'Long Division', subtitle: 'Divide & conquer', to: '/math/division', locked: false },
  { id: 'multiplication', emoji: '✖️', title: 'Multiplication', subtitle: 'Times tables', locked: true },
  { id: 'fractions', emoji: '🍕', title: 'Fractions', subtitle: 'Parts of a whole', locked: true },
  { id: 'addition', emoji: '➕', title: 'Addition', subtitle: 'Adding up', locked: true },
  { id: 'subtraction', emoji: '➖', title: 'Subtraction', subtitle: 'Taking away', locked: true },
]

export default function Math() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <BackButton to="/" label="Back" />

      <h1 className="font-heading text-3xl font-bold text-cream mt-6 mb-6">
        🔢 Math World
      </h1>

      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {topics.map(topic => (
          <SubjectCard
            key={topic.id}
            emoji={topic.emoji}
            title={topic.title}
            subtitle={topic.subtitle}
            to={topic.to}
            locked={topic.locked}
          />
        ))}
      </div>
    </div>
  )
}
