import { useRef, useState } from 'react'
import { LEVELS, rungName, TOP } from '../content/levels'
import { fill, THEMES } from '../content/themes'
import { howText, type LevelStat } from '../db/derive'
import { eraseProgress, exportBackup, importBackup, update, useStore } from '../db/store'
import { fmtN } from '../engine/util'
import { clearPin, hasPin, pinMatches, setPin } from '../lib/pin'
import { getVoices, speak, speechOk } from '../lib/speech'
import { checkPassword, signIn, signOut, signUp, syncNow } from '../sync/sync'
import { toast } from '../components/Toast'

/** 4-digit PIN pad. First visit: choose a PIN (entered twice). After that: enter it. */
function PinGate({ onOk, onBack }: { onOk: () => void; onBack: () => void }) {
  const st = useStore()
  const creating = !hasPin()
  const [entry, setEntry] = useState('')
  const [first, setFirst] = useState('')
  const [msg, setMsg] = useState('')
  const [forgot, setForgot] = useState(false)
  const [pw, setPw] = useState('')

  const press = (d: string) => {
    if (entry.length >= 4) return
    const e = entry + d
    setEntry(e)
    setMsg('')
    if (e.length < 4) return
    setTimeout(() => {
      setEntry('')
      if (!creating) {
        if (pinMatches(e)) onOk()
        else setMsg('That PIN does not match. Try again.')
      } else if (!first) setFirst(e)
      else if (first === e) {
        setPin(e)
        onOk()
      } else {
        setFirst('')
        setMsg('Those did not match. Start again.')
      }
    }, 150)
  }
  return (
    <div className="screen" data-testid="pin">
      <div className="top">
        <button className="iconbtn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h1>Coach's Corner</h1>
        <div className="spacer" />
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{creating ? (first ? 'Enter the PIN again' : 'Grown-ups: choose a 4-digit PIN') : 'Grown-ups: enter your PIN'}</div>
        {creating && !first && <div className="note">This keeps settings and progress controls for parents only.</div>}
        <div className="pindots" aria-label={`${entry.length} of 4 digits entered`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < entry.length ? 'on' : ''} />
          ))}
        </div>
        <div className="note" style={{ minHeight: 20, color: '#b45309', opacity: 1 }} role="status">
          {msg}
        </div>
      </div>
      <div className="pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => press(String(n))}>
            {n}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}>0</button>
        <button className="del" aria-label="Delete" onClick={() => setEntry(entry.slice(0, -1))}>
          ⌫
        </button>
      </div>
      {!creating &&
        (forgot ? (
          <div className="card">
            {st.sync.email ? (
              <div className="field">
                <label>Enter the family account password ({st.sync.email}) to choose a new PIN</label>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
                <div className="row">
                  <button
                    className="sbtn pri"
                    onClick={async () => {
                      if (await checkPassword(pw)) {
                        clearPin()
                        setForgot(false)
                        setPw('')
                        setMsg('')
                      } else setMsg('That password is not right.')
                    }}
                  >
                    Reset PIN
                  </button>
                </div>
              </div>
            ) : (
              <div className="note">To reset a forgotten PIN, sign in to the family account on a device where Coach's Corner is open, or clear this site's data in the browser settings (export a backup first if you can).</div>
            )}
          </div>
        ) : (
          <button className="sbtn" style={{ alignSelf: 'center', background: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={() => setForgot(true)}>
            Forgot PIN?
          </button>
        ))}
    </div>
  )
}

function CloudCard() {
  const { sync } = useStore()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (fn: typeof signIn) => {
    setBusy(true)
    setMsg((await fn(email.trim(), pw)) ?? '')
    setBusy(false)
    setPw('')
  }
  if (!sync.configured)
    return (
      <div className="card">
        <div className="lbl">Cloud sync</div>
        <p className="note" style={{ margin: 0 }}>
          Not connected. Progress is saved on this device and survives closing the app and restarting. To carry progress between devices today, use Export on one device and Import on the other. Automatic sync turns on once the family Supabase project is linked.
        </p>
      </div>
    )
  const status = { off: 'Off', idle: sync.lastAt ? `Up to date · last synced ${new Date(sync.lastAt).toLocaleTimeString()}` : 'Ready', syncing: 'Syncing…', error: `Could not sync: ${sync.error || 'unknown problem'}. Will retry.`, offline: 'Offline. Will sync when the internet is back.' }[sync.status]
  return (
    <div className="card">
      <div className="lbl">Cloud sync</div>
      {sync.email ? (
        <>
          <p style={{ margin: '0 0 8px' }}>
            Signed in as <b>{sync.email}</b>
          </p>
          <p className="note" data-testid="sync-status">
            {status}
          </p>
          <div className="row">
            <button className="sbtn pri" onClick={() => void syncNow()}>
              Sync now
            </button>
            <button className="sbtn" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
          <p className="note">Sign in with the same account on another iPad or phone and Kam's progress follows him. He never needs to log in.</p>
        </>
      ) : (
        <>
          <p className="note" style={{ marginTop: 0 }}>
            Sign in once with the family account. After that this device syncs in the background.
          </p>
          <div className="field">
            <label htmlFor="cEmail">Email</label>
            <input id="cEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="cPw">Password</label>
            <input id="cPw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="row">
            <button className="sbtn pri" disabled={busy || !email || !pw} onClick={() => void go(signIn)}>
              Sign in
            </button>
            <button className="sbtn" disabled={busy || !email || pw.length < 8} onClick={() => void go(signUp)}>
              Create family account
            </button>
          </div>
          {msg && (
            <p className="note" role="status">
              {msg}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default function Parent({ onBack }: { onBack: () => void }) {
  const st = useStore()
  const [open, setOpen] = useState(false)
  const [armed, setArmed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!open) return <PinGate onOk={() => setOpen(true)} onBack={onBack} />

  const f = st.profile.fields
  const { stats, missed } = st.derived
  const th = THEMES[f.theme] || THEMES.baseball
  const row = (key: string, icon: string, name: string, ex: string, status: string, s?: LevelStat) => (
    <tr key={key}>
      <td>
        {icon} {name}
        <br />
        <span className="note">{ex}</span>
      </td>
      <td>{status}</td>
      <td>{s ? s.att : 0}</td>
      <td>{s?.att ? Math.round((s.first / s.att) * 100) + '%' : '–'}</td>
      <td>{s?.att ? Math.round(s.ms / s.att / 1000) + 's' : '–'}</td>
    </tr>
  )
  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `math-all-stars-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    toast('Backup saved')
  }
  const doImport = async (file?: File) => {
    if (!file) return
    try {
      const added = await importBackup(JSON.parse(await file.text()))
      toast(`Backup merged: ${added} new answers added`)
    } catch (e) {
      toast(e instanceof Error && !(e instanceof SyntaxError) ? e.message : 'That file could not be read.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="screen" data-testid="parent">
      <div className="top">
        <button className="iconbtn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h1>Coach's Corner</h1>
        <div className="spacer" />
      </div>
      <div className="col">
        <div className="card">
          <div className="lbl">Progress</div>
          <p className="note" style={{ marginTop: 0 }}>
            🧗 Best Climb: {f.climbBest ? `Rung ${f.climbBest} (${rungName(f.climbBest - 1)})` : 'not tried yet'} · ⚾ Ballgames: {st.games.length} played, {st.games.filter((x) => x.result === 'W').length} won
          </p>
          <table className="ptable">
            <thead>
              <tr>
                <th>Level</th>
                <th>Status</th>
                <th>Tries</th>
                <th>1st try</th>
                <th>Avg</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((l, i) => row(String(i), l.icon, l.name, l.ex, i < f.unlocked ? '⭐ Mastered' : i === f.unlocked ? '▶ Working' : '🔒 Locked', stats[i]))}
              {stats[TOP + 1] && row('super', '🧗', 'Super Rungs', 'Climb only, past level 18', '—', stats[TOP + 1])}
            </tbody>
          </table>
          <p className="note">
            A level is mastered at 5 of the last 6 right on the first try (no hints). In regular rounds, problems 5 and 9 are bonus problems from the next level when he's doing well. The Climb goes up a rung every 2 right in a row and never ends — after level 18 it keeps growing into bigger multiplying, dividing, and multi-digit numbers. Every answer is saved on this device the moment he gives it.
          </p>
        </div>

        <div className="card">
          <div className="lbl">Recent misses &amp; hints</div>
          {missed.length ? (
            missed.slice(0, 15).map((m) => (
              <div className="miss" key={m.id}>
                <b>{m.q}</b> → {fmtN(m.target)} ·{' '}
                <span className="note">
                  {howText(m)}, {new Date(m.ts).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="note">Nothing yet.</div>
          )}
        </div>

        <div className="card">
          <div className="lbl">Settings</div>
          <div className="field">
            <label htmlFor="pName">Kid's name</label>
            <input id="pName" defaultValue={f.name} maxLength={20} onBlur={(e) => update({ name: e.target.value.trim() || 'Kam' })} />
          </div>
          <div className="field">
            <label htmlFor="pRead">Read problems aloud</label>
            <select id="pRead" value={f.autoRead} onChange={(e) => update({ autoRead: e.target.value as typeof f.autoRead })}>
              <option value="words">Word problems, agree/disagree &amp; mystery (recommended)</option>
              <option value="all">Every problem</option>
              <option value="off">Only when he taps 🔊</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pLevel">Read-along help</label>
            <select id="pLevel" value={f.readLevel || 1} onChange={(e) => update({ readLevel: +e.target.value as 1 | 2 | 3 })}>
              <option value={1}>Level 1: read everything to him</option>
              <option value={2}>Level 2: read the first sentence, he taps for the rest</option>
              <option value={3}>Level 3: he reads; tap to hear</option>
            </select>
            <span className="note">Words light up as they are spoken, and he can tap any word to hear it. Move up a level as his reading grows.</span>
          </div>
          <div className="field">
            <label htmlFor="pInn">Ballgame length</label>
            <select id="pInn" value={f.gameInnings || 3} onChange={(e) => update({ gameInnings: +e.target.value })}>
              <option value={3}>3 innings (about 10 minutes)</option>
              <option value={6}>6 innings</option>
              <option value={9}>9 innings</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pVoice">Voice</label>
            <select id="pVoice" value={f.voice} onChange={(e) => update({ voice: e.target.value })}>
              <option value="">Automatic</option>
              {getVoices().map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <div className="row">
              <button className="sbtn" onClick={() => speak(fill(th.praise[Math.floor(Math.random() * th.praise.length)], f.name, th))}>
                🔊 Test voice
              </button>
            </div>
            <span className="note">
              {speechOk()
                ? 'Tip: on iPhone/iPad, nicer voices can be downloaded in Settings → Accessibility → Spoken Content → Voices (look for "Enhanced").'
                : "This browser can't speak out loud. Try Safari or Chrome."}
            </span>
          </div>
          <div className="field">
            <label htmlFor="pRate">
              Talking speed: <b>{f.rate}</b>
            </label>
            <input id="pRate" type="range" min="0.7" max="1.2" step="0.05" value={f.rate} onChange={(e) => update({ rate: +e.target.value })} />
          </div>
          <div className="field">
            <label>
              <input type="checkbox" checked={f.sfx} onChange={(e) => update({ sfx: e.target.checked })} /> Sound effects
            </label>
          </div>
          <div className="field">
            <label htmlFor="pUnlock">Highest unlocked level</label>
            <select
              id="pUnlock"
              value={f.unlocked}
              onChange={(e) => {
                update({ unlocked: +e.target.value, current: +e.target.value, parentAt: Date.now() })
                toast('Levels updated')
              }}
            >
              {LEVELS.map((l, i) => (
                <option key={i} value={i}>
                  {i + 1}. {l.icon} {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <button
              className="sbtn"
              onClick={() => {
                clearPin()
                setOpen(false)
              }}
            >
              Change PIN
            </button>
          </div>
        </div>

        <div className="card" data-testid="reading-card">
          <div className="lbl">Reading: words he taps to hear</div>
          {Object.keys(f.wordTaps || {}).length ? (
            <div className="chips">
              {Object.entries(f.wordTaps)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([w, n]) => (
                  <span key={w} className="sbtn">
                    {w} <span className="note">×{n}</span>
                  </span>
                ))}
            </div>
          ) : (
            <div className="note">Nothing yet. When he taps a word to hear it, it shows up here as a sight word to practice.</div>
          )}
        </div>

        <CloudCard />

        <div className="card">
          <div className="lbl">Backup</div>
          <p className="note" style={{ marginTop: 0 }}>
            Export saves all progress and settings to a file. Import merges a backup into this device; nothing already here is lost.
          </p>
          <div className="row">
            <button className="sbtn pri" onClick={doExport}>
              ⬇ Export backup
            </button>
            <button className="sbtn" onClick={() => fileRef.current?.click()}>
              ⬆ Import backup
            </button>
            <input ref={fileRef} data-testid="import-file" type="file" accept="application/json,.json" hidden onChange={(e) => void doImport(e.target.files?.[0])} />
          </div>
          <p className="note">{st.attempts.length} answers saved on this device.</p>
        </div>

        <div className="card">
          <div className="lbl">Start over</div>
          <div className="row">
            <button
              className="sbtn warn"
              onClick={() => {
                if (!armed) {
                  setArmed(true)
                  setTimeout(() => setArmed(false), 3000)
                  return
                }
                setArmed(false)
                void eraseProgress().then(() => toast('Progress erased'))
              }}
            >
              {armed ? 'Tap again to erase everything' : 'Erase all progress'}
            </button>
          </div>
          <p className="note">Keeps the name, theme, voice and PIN. If cloud sync is on, progress is erased on every device.</p>
        </div>
      </div>
    </div>
  )
}
