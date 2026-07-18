export default function StarBadge({ count }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border-2 border-gold/50">
      <span className="text-xl">⭐</span>
      <span className="font-heading text-lg font-bold text-gold">{count}</span>
      <span className="font-body text-sm text-cream/80">stars</span>
    </div>
  )
}
