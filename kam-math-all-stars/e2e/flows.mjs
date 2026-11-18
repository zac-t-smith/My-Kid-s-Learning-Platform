// End-to-end flows on an iPad-sized screen, run against the production build.
// Usage: npm run e2e
import { chromium } from 'playwright'
import { preview } from 'vite'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'silent' })
const URL = 'http://localhost:4179/'
const browser = await chromium.launch()
const errors = []
let passed = 0

async function newPage(ctx) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
  return page
}
async function open(ctx) {
  const page = await newPage(ctx)
  await page.goto(URL)
  await page.getByRole('button', { name: /Tap to Play/ }).click()
  await page.getByTestId('home').waitFor()
  return page
}
const digits = async (page, n) => {
  for (const d of String(n)) await page.locator('.pad button', { hasText: new RegExp(`^${d}$`) }).click()
  await page.getByRole('button', { name: 'Check' }).click()
}
/** Answer the problem on screen. right=false gives a wrong answer once. */
async function answer(page, right = true) {
  const play = page.getByTestId('play')
  const target = Number(await play.getAttribute('data-target'))
  const agree = await play.getAttribute('data-agree')
  if (agree && (await page.locator('.agree').count())) {
    const truth = agree === 'true'
    await page.getByRole('button', { name: (right ? truth : !truth) ? /Agree/ : /Disagree/ }).first().click()
    if (right && !truth) await digits(page, target)
    return
  }
  await digits(page, right ? target : target + 1)
}
/** Type on the PIN pad (it pauses briefly after each 4 digits). */
async function pin(page, code) {
  for (let i = 0; i < code.length; i++) {
    await page.locator('.pad button', { hasText: new RegExp(`^${code[i]}$`) }).click()
    if (i % 4 === 3) await page.waitForTimeout(300)
  }
}
const next = (page) => page.getByRole('button', { name: /^Next/ }).click()
async function test(name, fn) {
  const t = Date.now()
  await fn()
  passed++
  console.log(`  ✓ ${name} (${Date.now() - t}ms)`)
}

const ipad = { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
const ctx = await browser.newContext(ipad)
await ctx.addInitScript(() => (window.__E2E__ = true))

try {
  await test('a full 10-problem round, all first try, unlocks the next level', async () => {
    const page = await open(ctx)
    await page.getByRole('button', { name: /^▶ Practice/ }).click()
    // first time: the lesson plays first
    await page.getByTestId('lesson').waitFor()
    for (let i = 0; i < 8 && !(await page.getByRole('button', { name: /Let's play/ }).count()); i++) await page.getByRole('button', { name: /Next/ }).click()
    await page.getByRole('button', { name: /Let's play/ }).click()
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('play').waitFor()
      await answer(page)
      await next(page)
    }
    await page.getByTestId('end').waitFor()
    assert.match(await page.getByTestId('end').innerText(), /10 out of 10 on the first try/)
    assert.match(await page.getByTestId('end').innerText(), /New level unlocked/)
    await page.screenshot({ path: 'e2e/shots/end.png' })
    await page.close()
  })

  await test('progress survives closing and reopening the app', async () => {
    const page = await open(ctx)
    assert.equal(await page.locator('.lvl.locked').count(), 16) // levels 1 and 2 open
    assert.match(await page.getByRole('button', { name: /^▶ Practice/ }).innerText(), /Ones Only/)
    await page.screenshot({ path: 'e2e/shots/home.png' })
    await page.close()
  })

  await test('the app opens and plays with no internet (after the first load)', async () => {
    const page = await open(ctx)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.waitForTimeout(1500)
    await ctx.setOffline(true)
    await page.reload()
    await page.getByRole('button', { name: /Tap to Play/ }).click()
    await page.getByRole('button', { name: 'Play Tens Jumps' }).click()
    await page.getByTestId('play').waitFor()
    await answer(page)
    assert.ok(await page.getByRole('button', { name: /^Next/ }).count())
    await ctx.setOffline(false)
    await page.close()
  })

  await test('a miss is a foul ball; two misses show ways to solve, never a dead end', async () => {
    const page = await open(ctx)
    await page.getByRole('button', { name: 'Play Tens Jumps' }).click()
    await page.getByTestId('play').waitFor()
    await answer(page, false)
    const fb = await page.getByTestId('feedback').innerText()
    assert.ok(fb.length > 0 && !/wrong|incorrect/i.test(fb), `kind retry line, got "${fb}"`)
    if (await page.locator('.agree').count()) await answer(page, false)
    else {
      await page.waitForTimeout(1000)
      await answer(page, false)
    }
    await page.getByTestId('sheet').waitFor()
    assert.match(await page.getByTestId('sheet').innerText(), /The answer is/)
    const tabs = page.locator('.sheet .chip')
    assert.ok((await tabs.count()) >= 1)
    for (let i = 0; i < (await tabs.count()); i++) await tabs.nth(i).click()
    await page.screenshot({ path: 'e2e/shots/ways.png' })
    // open the lesson from the sheet and come back to the same round
    await page.getByRole('button', { name: /📺 Lesson/ }).click()
    await page.getByTestId('lesson').waitFor()
    await page.screenshot({ path: 'e2e/shots/lesson.png' })
    await page.getByRole('button', { name: 'Close lesson' }).click()
    await page.getByTestId('play').waitFor()
    await next(page)
    await answer(page)
    await next(page)
    await page.getByRole('button', { name: 'Quit', exact: true }).click()
    await page.getByTestId('home').waitFor()
    await page.close()
  })

  await test('every lesson plays to the end', async () => {
    const page = await open(ctx)
    // unlock everything through Coach's Corner
    await page.getByRole('button', { name: /Coach's Corner/ }).click()
    await pin(page, '14141414')
    await page.getByTestId('parent').waitFor()
    await page.locator('#pUnlock').selectOption('17')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    for (let L = 0; L < 18; L++) {
      await page.locator('.lvl .go button').nth(L * 2).click()
      await page.getByTestId('lesson').waitFor()
      for (let i = 0; i < 10 && !(await page.getByRole('button', { name: /Let's play/ }).count()); i++) {
        await page.getByRole('button', { name: /Next/ }).click()
        await page.waitForTimeout(120)
      }
      assert.ok(await page.getByRole('button', { name: /Let's play/ }).count(), `lesson ${L + 1} finished`)
      await page.getByRole('button', { name: 'Close lesson' }).click()
      await page.getByTestId('home').waitFor()
    }
    await page.close()
  })

  await test('every level plays a problem of every kind without breaking', async () => {
    const page = await open(ctx)
    for (let L = 0; L < 18; L++) {
      await page.locator('.lvl .go button').nth(L * 2 + 1).click()
      await page.getByTestId('play').waitFor()
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /Ways to solve/ }).click()
        await page.getByTestId('sheet').waitFor()
        await page.getByRole('button', { name: 'Close', exact: true }).click()
        await answer(page)
        await next(page)
      }
      await page.getByRole('button', { name: 'Quit', exact: true }).click()
      await page.getByTestId('home').waitFor()
    }
    await page.close()
  })

  await test('The Climb: climbs on 2 in a row, ends after 3 lives, offers nothing scary', async () => {
    const page = await open(ctx)
    await page.getByRole('button', { name: /Start climbing/ }).click()
    await page.getByTestId('play').waitFor()
    const rung0 = await page.locator('.lvlname').innerText()
    await answer(page); await next(page)
    await answer(page); await next(page)
    assert.notEqual(await page.locator('.lvlname').innerText(), rung0)
    await page.screenshot({ path: 'e2e/shots/climb.png' })
    for (let life = 0; life < 3; life++) {
      await page.getByTestId('play').waitFor()
      await answer(page, false)
      await page.waitForTimeout(1000)
      await answer(page, false)
      await page.getByTestId('sheet').waitFor()
      await page.getByRole('button', { name: 'Close', exact: true }).click()
      await next(page)
    }
    await page.getByTestId('end').waitFor()
    assert.match(await page.getByTestId('end').innerText(), /You reached Rung/)
    await page.getByRole('button', { name: /Home/ }).click()
    assert.match(await page.getByTestId('home').innerText(), /Your best: Rung/)
    await page.close()
  })

  await test("Coach's Corner: PIN gate, stats, export, erase, import restores everything", async () => {
    const page = await open(ctx)
    await page.getByRole('button', { name: /Coach's Corner/ }).click()
    await page.getByTestId('pin').waitFor()
    await pin(page, '9999')
    assert.match(await page.getByTestId('pin').innerText(), /does not match/)
    await pin(page, '1414')
    await page.getByTestId('parent').waitFor()
    const body = await page.getByTestId('parent').innerText()
    assert.match(body, /Tens Jumps/)
    assert.match(body, /Recent misses/i)
    const saved = Number(/(\d+) answers saved/.exec(body)[1])
    assert.ok(saved >= 60, `answers saved: ${saved}`)
    await page.screenshot({ path: 'e2e/shots/parent.png', fullPage: true })
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export backup/ }).click()])
    const file = 'e2e/shots/backup.json'
    await dl.saveAs(file)
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).attempts.length, saved)
    await page.getByRole('button', { name: /Erase all progress/ }).click()
    await page.getByRole('button', { name: /Tap again/ }).click()
    await page.getByText('0 answers saved').waitFor()
    await page.close()

    // a brand-new device: import the backup and the progress is there
    const ctx2 = await browser.newContext(ipad)
    const p2 = await open(ctx2)
    assert.equal(await p2.locator('.lvl.locked').count(), 17)
    await p2.getByRole('button', { name: /Coach's Corner/ }).click()
    await pin(p2, '25802580')
    await p2.getByTestId('parent').waitFor()
    await p2.getByTestId('import-file').setInputFiles(file)
    await p2.getByText(`${saved} answers saved`).waitFor()
    await p2.getByRole('button', { name: 'Back', exact: true }).click()
    assert.equal(await p2.locator('.lvl.locked').count(), 0)
    await ctx2.close()
    fs.rmSync(file)
  })

  /** Play whatever the Ballgame is showing. `skill` = chance of answering right. Returns when the game is final. */
  async function playGame(page, skill = 0.85, stopAfterPlays = Infinity) {
    let plays = 0
    for (let step = 0; step < 400; step++) {
      if (await page.getByTestId('game-final').count()) return plays
      const nextBtn = page.locator('.gright > .btn')
      if (await page.getByTestId('sheet').count()) await page.getByRole('button', { name: 'Close', exact: true }).click()
      else if (await nextBtn.count()) {
        await nextBtn.click()
        if (++plays >= stopAfterPlays) return plays
      } else if (await page.getByTestId('game-break').count()) await page.locator('[data-testid=game-break] .btn').click()
      else if (await page.getByTestId('pitch-pick').count()) await page.locator(`[data-pitch=${['fastball', 'curveball', 'slider', 'meatball'][step % 4]}]`).click()
      else if (await page.getByTestId('atbat').count()) {
        const ab = page.getByTestId('atbat')
        const target = Number(await ab.getAttribute('data-target'))
        const truth = (await ab.getAttribute('data-agree')) === 'true'
        const right = Math.random() < skill
        for (let swing = 0; swing < 2 && !(await nextBtn.count()); swing++) {
          if (await page.locator('.agree').count()) {
            await page.getByRole('button', { name: (right ? truth : !truth) ? /Agree/ : /Disagree/ }).first().click()
            if (right && !truth) { await pinDigits(page, target); await page.getByRole('button', { name: 'Swing' }).click() }
          } else {
            await page.waitForTimeout(swing ? 1000 : 0)
            await pinDigits(page, right ? target : target + 1)
            await page.getByRole('button', { name: 'Swing' }).click()
          }
          if (right) break
        }
      } else if (await page.getByTestId('pitching').count()) {
        const el = page.getByTestId('pitching')
        const right = Math.random() < skill
        const a = right ? await el.getAttribute('data-a') : '99', b = right ? await el.getAttribute('data-b') : '99'
        for (let t = 0; t < 2 && !(await nextBtn.count()); t++) {
          for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Delete' }).click()
          await page.getByRole('button', { name: 'First number' }).click()
          await pinDigits(page, a)
          await page.getByRole('button', { name: 'Second number' }).click()
          for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Delete' }).click()
          await pinDigits(page, b)
          await page.getByRole('button', { name: 'Pitch', exact: true }).click()
        }
      } else if (await page.getByTestId('fielding').count()) {
        const el = page.getByTestId('fielding')
        const ans = Number(await el.getAttribute('data-answer'))
        const n = await page.locator('.choices button').count()
        await page.locator('.choices button').nth(Math.random() < skill ? ans : (ans + 1) % n).click()
      }
      await page.waitForTimeout(40)
    }
    throw new Error('game did not finish: dead end?')
  }
  const pinDigits = async (page, n) => { for (const d of String(n)) await page.locator('.pad button', { hasText: new RegExp(`^${d}$`) }).click() }

  await test('Ballgame: a full 3-inning game plays start to finish, then shows on the player card', async () => {
    const c = await browser.newContext(ipad)
    await c.addInitScript(() => (window.__E2E__ = true))
    const page = await open(c)
    await page.getByRole('button', { name: /Play ball!/ }).click()
    await page.getByTestId('game-setup').waitFor()
    await page.getByRole('button', { name: 'Sluggers' }).click()
    await page.getByRole('button', { name: /Sunset Park/ }).click()
    await page.screenshot({ path: 'e2e/shots/game-setup.png' })
    await page.getByRole('button', { name: /Play ball!/ }).click()
    await page.getByTestId('pitch-pick').waitFor()
    await page.screenshot({ path: 'e2e/shots/game-pick.png' })
    // play a few plays, leave, and come back: the game is still there
    await playGame(page, 0.85, 4)
    const score = await page.getByTestId('scoreboard').innerText()
    await page.screenshot({ path: 'e2e/shots/game-play.png' })
    await page.reload()
    await page.getByRole('button', { name: /Tap to Play/ }).click()
    assert.match(await page.getByTestId('ballgame-card').innerText(), /Your game is waiting/)
    await page.getByRole('button', { name: /Keep playing/ }).click()
    await page.getByTestId('ballgame').waitFor()
    assert.equal(await page.getByTestId('scoreboard').innerText(), score)
    await playGame(page, 0.85)
    await page.getByTestId('game-final').waitFor()
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'e2e/shots/game-final.png' })
    const board = await page.getByTestId('scoreboard').innerText()
    assert.match(board, /Final/)
    assert.match(board, /Kam's Sluggers/)
    await page.getByRole('button', { name: /My player card/ }).click()
    await page.getByTestId('card').waitFor()
    assert.match(await page.getByTestId('card').innerText(), /1 game/)
    await page.getByRole('button', { name: 'How is this figured?' }).first().click()
    assert.match(await page.locator('.pc-how').innerText(), /first-swing hits in \d+ at-bats/)
    await page.screenshot({ path: 'e2e/shots/card.png' })
    await c.close()
  })

  await test('Ballgame: games with lots of misses, and 6-inning games, also always finish', async () => {
    for (const [skill, innings] of [[0.15, 3], [0.6, 6]]) {
      const c = await browser.newContext(ipad)
      await c.addInitScript(() => (window.__E2E__ = true))
      const page = await open(c)
      if (innings !== 3) {
        await page.getByRole('button', { name: /Coach's Corner/ }).click()
        await pin(page, '14141414')
        await page.locator('#pInn').selectOption(String(innings))
        await page.getByRole('button', { name: 'Back', exact: true }).click()
      }
      await page.getByRole('button', { name: /Play ball!/ }).click()
      await page.getByRole('button', { name: /Play ball!/ }).click()
      await playGame(page, skill)
      const cols = await page.locator('.score thead th').count()
      assert.ok(cols >= innings + 3, `line score has ${innings} innings`)
      await c.close()
    }
  })

  await test('Read-along: the highlighted word follows the voice, with and without browser word events', async () => {
    for (const boundaries of [true, false]) {
      const c = await browser.newContext(ipad)
      await c.addInitScript((boundaries) => {
        window.__E2E__ = true
        window.__spoken = []
        // A stand-in voice: speaks one word every 160ms and (optionally) reports each word like Safari does.
        class U { constructor(t) { this.text = t; this.rate = 1 } }
        const synth = {
          getVoices: () => [], cancel() { clearInterval(this.t) }, onvoiceschanged: null,
          speak(u) {
            clearInterval(this.t)
            const words = [...u.text.matchAll(/\S+/g)]
            let i = 0
            setTimeout(() => u.onstart && u.onstart({}), 10)
            this.t = setInterval(() => {
              if (i >= words.length) { clearInterval(this.t); u.onend && u.onend({}); return }
              if (boundaries) {
                u.onboundary && u.onboundary({ name: 'word', charIndex: words[i].index })
                const said = words[i][0]
                // look at the screen a moment later (40ms), well before the next word (160ms)
                setTimeout(() => {
                  const on = document.querySelector('.caption .w.on')
                  if (document.querySelector('.caption')) window.__spoken.push([said, on ? on.textContent : null])
                }, 40)
              }
              i++
            }, boundaries ? 160 : 400)
          },
        }
        Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
        window.SpeechSynthesisUtterance = U
      }, boundaries)
      const page = await open(c)
      await page.getByRole('button', { name: 'Watch lesson: Tens Jumps' }).click()
      await page.getByTestId('lesson').waitFor()
      const caption = (await page.locator('.caption').innerText()).split(/\s+/)
      if (boundaries) {
        await page.waitForFunction((n) => window.__spoken.length >= n, caption.length, { timeout: 15000 })
        const spoken = await page.evaluate(() => window.__spoken)
        const first = spoken.slice(0, caption.length)
        first.forEach(([said, lit], i) => assert.equal(lit, caption[i], `word ${i}: voice said "${said}" but "${lit}" was lit`))
      } else {
        // no word events: the timed fallback still walks every word in order
        const seen = []
        const text0 = await page.locator('.caption').innerText()
        for (let i = 0; i < 400 && seen.length < caption.length && (await page.locator('.caption').innerText()) === text0; i++) {
          const w = await page.evaluate(() => { const els = [...document.querySelectorAll('.caption .w')]; return els.findIndex((e) => e.classList.contains('on')) })
          if (w >= 0 && seen[seen.length - 1] !== w) seen.push(w)
          await page.waitForTimeout(40)
        }
        assert.ok(seen.length >= caption.length * 0.8, `fallback lit ${seen.length} of ${caption.length} words`)
        assert.deepEqual(seen, [...seen].sort((a, b) => a - b), 'words light up in order')
        await page.screenshot({ path: 'e2e/shots/readalong.png' })
      }
      // tap a word to hear it; it is counted for the parent
      await page.getByRole('button', { name: /Pause/ }).click()
      await page.locator('.caption .w', { hasText: /^little$/ }).click()
      await page.locator('.caption .w', { hasText: /^little$/ }).click()
      await page.getByRole('button', { name: 'Close lesson' }).click()
      await page.getByRole('button', { name: /Coach's Corner/ }).click()
      await pin(page, '14141414')
      assert.match(await page.getByTestId('reading-card').innerText(), /little\s*×2/)
      await c.close()
    }
  })

  await test('fits a phone and an iPad in portrait with no sideways scrolling', async () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
      const c = await browser.newContext({ viewport, hasTouch: true, isMobile: true })
      await c.addInitScript(() => (window.__E2E__ = true))
      const page = await open(c)
      await page.getByRole('button', { name: /Start climbing/ }).click()
      await page.getByTestId('play').waitFor()
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert.ok(over <= 0, `sideways overflow ${over}px at ${viewport.width}px`)
      const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && (b.offsetWidth < 56 || b.offsetHeight < 56)).map((b) => b.textContent))
      assert.deepEqual(small, [], 'every button is at least 56px')
      await page.waitForTimeout(400)
      if (viewport.width === 390) await page.screenshot({ path: 'e2e/shots/phone-play.png' })
      await c.close()
    }
  })

  assert.deepEqual(errors, [], 'no page errors')
  console.log(`\n${passed} flows passed, no page errors`)
} catch (e) {
  console.error('\nFAILED:', e.message, '\npage errors:', errors)
  process.exitCode = 1
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}
