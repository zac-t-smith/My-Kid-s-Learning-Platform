import { useMemo, useState } from 'react'
import { countWordTap } from '../db/store'
import { speak, tokenize, useReading, type Tok } from '../lib/speech'

/**
 * Text Kam can read along with. The word being spoken is highlighted, and tapping any word says just that word.
 * `id` ties it to `speak(text, { id })`. `offset` lets several blocks share one spoken passage (steps in a list).
 */
export default function ReadAlong({ id, text, tokens, offset = 0, className, testId }: { id: string; text?: string; tokens?: Tok[]; offset?: number; className?: string; testId?: string }) {
  const toks = useMemo(() => tokens ?? tokenize(text || ''), [tokens, text])
  const at = useReading(id) - offset
  const [tapped, setTapped] = useState(-1)
  return (
    <div className={'ra ' + (className || '')} data-testid={testId}>
      {toks.map((t, i) => (
        <span key={i}>
          <span
            className={'w' + (i === at || i === tapped ? ' on' : '')}
            onClick={(e) => {
              if (!t.say) return
              e.stopPropagation()
              setTapped(i)
              countWordTap(t.say)
              speak(t.say.replace(/[.,!?:;]+$/, ''), { onend: () => setTapped(-1) })
            }}
          >
            {t.show}
          </span>{' '}
        </span>
      ))}
    </div>
  )
}
