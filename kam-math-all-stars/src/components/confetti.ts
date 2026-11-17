/** A little burst of theme icons from the middle of the screen. */
export function confetti(win: string) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const icons = [win, win, '✨', '⭐']
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span')
    s.className = 'conf'
    s.textContent = icons[Math.floor(Math.random() * icons.length)]
    s.style.left = window.innerWidth / 2 + 'px'
    s.style.top = window.innerHeight * 0.38 + 'px'
    s.style.setProperty('--dx', Math.random() * 360 - 180 + 'px')
    s.style.setProperty('--dy', Math.random() * -260 - 40 + 'px')
    s.style.setProperty('--r', Math.random() * 540 - 270 + 'deg')
    document.body.appendChild(s)
    setTimeout(() => s.remove(), 1500)
  }
}
