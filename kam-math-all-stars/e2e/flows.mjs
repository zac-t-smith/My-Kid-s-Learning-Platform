// End-to-end flows on an iPad-sized screen, run against the production build.
// Usage: npm run e2e            (samples the new skills)
//        FULL=1 npm run e2e     (plays every skill in the graph through the real screens)
import { chromium } from 'playwright'
import { preview } from 'vite'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const FULL = !!process.env.FULL
const ONLY = process.env.ONLY // run only flows whose name contains this text
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
const ipad = { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
async function newCtx(opts = ipad) {
  const c = await browser.newContext(opts)
  await c.addInitScript(() => (window.__E2E__ = true))
  return c
}

/** Type an answer on the pad: digits, decimal point, fraction bar, minus sign. Then press the go key. */
async function typeAnswer(page, text) {
  const s = String(text)
  for (const ch of s.replace('-', '')) {
    if (ch === '.') await page.getByRole('button', { name: 'Decimal point' }).click()
    else if (ch === '/') await page.getByRole('button', { name: 'Fraction bar' }).click()
    else await page.locator('.pad button', { hasText: new RegExp(`^${ch}$`) }).click()
  }
  if (s.startsWith('-')) await page.getByRole('button', { name: 'Plus or minus' }).click()
  await page.locator('.pad .go').click()
}
const wrongOf = (ans, input) => (input === 'fraction' ? ans.replace(/\/(\d+)$/, (_, d) => `/${+d + 1}`) : input === 'decimal' ? (ans.includes('.') ? ans + '1' : ans + '.5') : String(Math.abs(Number(ans)) + 1))
/** Answer the problem on screen. right=false gives one wrong answer. Returns the kind of input it was. */
async function answer(page, right = true) {
  const it = page.getByTestId('item')
  const ans = await it.getAttribute('data-answer')
  const input = await it.getAttribute('data-input')
  const agree = await it.getAttribute('data-agree')
  if (agree && (await page.locator('.agree').count())) {
    const truth = agree === 'true'
    await page.getByRole('button', { name: (right ? truth : !truth) ? /Agree/ : /Disagree/ }).first().click()
    if (right && !truth) await typeAnswer(page, ans)
  } else if (input === 'choice') {
    const all = await page.locator('.choices button:not(.picked)').evaluateAll((els) => els.map((e) => e.getAttribute('data-choice')))
    const pick = right ? ans : all.find((c) => c !== ans)
    await page.locator('.choices button:not(.picked)').nth(all.indexOf(pick)).click()
  } else await typeAnswer(page, right ? ans : wrongOf(ans, input))
  return input
}
const next = (page) => page.getByRole('button', { name: /^Next/ }).click()
/** Click through a lesson to the end and start playing. */
async function finishLesson(page) {
  await page.getByTestId('lesson').waitFor()
  for (let i = 0; i < 30 && !(await page.getByRole('button', { name: /Let's play/ }).count()); i++) {
    await page.getByRole('button', { name: /Next/ }).click()
    await page.waitForTimeout(60)
  }
  assert.ok(await page.getByRole('button', { name: /Let's play/ }).count(), 'lesson reached its end')
  await page.getByRole('button', { name: /Let's play/ }).click()
}
/** Start practicing the first suggested skill from Home (watching its lesson first if it is new). */
async function startPractice(page) {
  await page.locator('[data-testid=up-next] .sk .go button').nth(1).click()
  await Promise.race([page.getByTestId('lesson').waitFor(), page.getByTestId('play').waitFor()])
  if (await page.getByTestId('lesson').count()) await finishLesson(page)
  await page.getByTestId('play').waitFor()
}
/** Type on the PIN pad (it pauses briefly after each 4 digits). */
async function pin(page, code) {
  for (let i = 0; i < code.length; i++) {
    await page.locator('.pad button', { hasText: new RegExp(`^${code[i]}$`) }).click()
    if (i % 4 === 3) await page.waitForTimeout(300)
  }
}
async function test(name, fn) {
  if (ONLY && !name.includes(ONLY)) return
  const t = Date.now()
  await fn()
  passed++
  console.log(`  ✓ ${name} (${Date.now() - t}ms)`)
}
/** Play whatever the Ballgame is showing. `skill` = chance of answering right. Returns when the game is final. */
async function playGame(page, skill = 0.85, stopAfterPlays = Infinity) {
  let plays = 0
  for (let step = 0; step < 600; step++) {
    if (await page.getByTestId('game-final').count()) return plays
    const nextBtn = page.locator('.gright > .btn')
    if (await page.getByTestId('sheet').count()) await page.getByRole('button', { name: 'Close', exact: true }).click()
    else if (await nextBtn.count()) {
      await nextBtn.click()
      if (++plays >= stopAfterPlays) return plays
    } else if (await page.getByTestId('game-break').count()) await page.locator('[data-testid=game-break] .btn').click()
    else if (await page.getByTestId('pitch-pick').count()) await page.locator(`[data-pitch=${['fastball', 'curveball', 'slider', 'meatball'][step % 4]}]`).click()
    else if (await page.getByTestId('item').count()) {
      const right = Math.random() < skill
      for (let swing = 0; swing < 2 && !(await nextBtn.count()) && (await page.getByTestId('item').count()); swing++) {
        if (swing) await page.waitForTimeout(1000)
        await answer(page, right)
        if (right) break
      }
    } else if (await page.getByTestId('pitching').count()) {
      const el = page.getByTestId('pitching')
      const right = Math.random() < skill
      const a = right ? await el.getAttribute('data-a') : '99',
        b = right ? await el.getAttribute('data-b') : '99'
      for (let t = 0; t < 2 && !(await nextBtn.count()); t++) {
        await page.getByRole('button', { name: 'First number' }).click()
        for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Delete' }).click()
        for (const d of a) await page.locator('.pad button', { hasText: new RegExp(`^${d}$`) }).click()
        await page.getByRole('button', { name: 'Second number' }).click()
        for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Delete' }).click()
        for (const d of b) await page.locator('.pad button', { hasText: new RegExp(`^${d}$`) }).click()
        await page.getByRole('button', { name: 'Pitch', exact: true }).click()
      }
    } else if (await page.getByTestId('fielding').count()) {
      const ans = Number(await page.getByTestId('fielding').getAttribute('data-answer'))
      const n = await page.locator('.choices button').count()
      await page.locator('.choices button').nth(Math.random() < skill ? ans : (ans + 1) % n).click()
    }
    await page.waitForTimeout(40)
  }
  throw new Error('game did not finish: dead end?')
}

const ctx = await newCtx()
try {
  await test('a full 10-problem round, all first try, masters the skill and opens new ones', async () => {
    const page = await open(ctx)
    assert.match(await page.getByTestId('up-next').innerText(), /Tens Jumps/)
    await startPractice(page)
    for (let i = 0; i < 10; i++) {
      await page.getByTestId('item').waitFor()
      await answer(page)
      await next(page)
    }
    await page.getByTestId('end').waitFor()
    const end = await page.getByTestId('end').innerText()
    assert.match(end, /10 out of 10 on the first try/)
    assert.match(end, /Mastered: Tens Jumps/)
    assert.match(end, /Ones Only/)
    await page.screenshot({ path: 'e2e/shots/end.png' })
    await page.close()
  })

  await test('progress survives closing and reopening the app', async () => {
    const page = await open(ctx)
    const up = await page.getByTestId('up-next').innerText()
    assert.match(up, /Ones Only/)
    assert.doesNotMatch(up, /Tens Jumps\n/)
    await page.screenshot({ path: 'e2e/shots/home.png', fullPage: true })
    await page.close()
  })

  await test('the app opens and plays with no internet (after the first load)', async () => {
    const page = await open(ctx)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.waitForTimeout(1500)
    await ctx.setOffline(true)
    await page.reload()
    await page.getByRole('button', { name: /Tap to Play/ }).click()
    await startPractice(page)
    await answer(page)
    assert.ok(await page.getByRole('button', { name: /^Next/ }).count())
    await ctx.setOffline(false)
    await page.close()
  })

  await test('a miss is a foul ball; two misses show ways to solve, never a dead end', async () => {
    const page = await open(ctx)
    await startPractice(page)
    let input = await answer(page, false)
    const twoChoice = input === 'choice' && (await page.locator('.choices button').count()) <= 2
    if (!twoChoice) {
      const fb = await page.getByTestId('feedback').innerText()
      assert.ok(fb.length > 0 && !/wrong|incorrect/i.test(fb), `kind retry line, got "${fb}"`)
      await page.waitForTimeout(1000)
      await answer(page, false)
    }
    await page.getByTestId('sheet').waitFor()
    assert.match(await page.getByTestId('sheet').innerText(), /The answer is/)
    const tabs = page.locator('.sheet .chip')
    assert.ok((await tabs.count()) >= 2, 'at least two ways to solve')
    for (let i = 0; i < (await tabs.count()); i++) await tabs.nth(i).click()
    await page.screenshot({ path: 'e2e/shots/ways.png' })
    // open the lesson from the sheet and come back to the same round
    await page.getByRole('button', { name: /📺 Lesson/ }).click()
    await page.getByTestId('lesson').waitFor()
    await page.getByRole('button', { name: 'Close lesson' }).click()
    await page.getByTestId('play').waitFor()
    await next(page)
    await answer(page)
    await next(page)
    await page.getByRole('button', { name: 'Quit', exact: true }).click()
    await page.getByTestId('home').waitFor()
    await page.close()
  })

  await test(`the skill graph through the real screens: lesson, then problems of every kind (${FULL ? 'every skill' : 'a sample'})`, async () => {
    const c = await newCtx()
    const page = await open(c)
    const all = await page.evaluate(() => window.__store.skills)
    const played = new Set()
    const kinds = new Set()
    // Walk the graph the way Kam will: play what is open, then mark it known so the next skills open.
    for (let round = 0; round < 40 && played.size < all.length; round++) {
      const status = await page.evaluate(() => window.__store.getState().derived.board.status)
      const open = all.filter((id) => (status[id] === 'open' || status[id] === 'learning') && !played.has(id))
      if (!open.length) break
      const todo = FULL ? open : open.filter((_, i) => i % 5 === round % 5).slice(0, 4)
      for (const id of todo) {
        const strand = id.split('.')[0]
        // open the strand in the skill map and tap the skill
        const strandBtn = page.locator('[data-testid=skill-map] > div > button.sk').nth(['nv', 'as', 'md', 'fr', 'me', 'ge', 'al', 'ps', 'ca'].indexOf(strand))
        if ((await strandBtn.getAttribute('aria-expanded')) !== 'true') await strandBtn.click()
        const name = id
        const idx = await page.evaluate(([strand, id]) => window.__store.skills.filter((s) => s.startsWith(strand + '.')).indexOf(id), [strand, id])
        await page.locator('[data-testid=skill-map] .smap > *').nth(idx).click()
        await finishLesson(page)
        await page.getByTestId('play').waitFor()
        for (let i = 0; i < 3; i++) {
          await page.getByTestId('item').waitFor()
          if (i === 0 && process.env.SHOTS) { await page.waitForTimeout(250); await page.screenshot({ path: `e2e/shots/skills/${id}.png` }) }
          await page.getByRole('button', { name: /Ways to solve/ }).click()
          if (i === 0 && process.env.SHOTS) { await page.waitForTimeout(900); await page.screenshot({ path: `e2e/shots/skills/${id}.ways.png` }) }
          await page.getByTestId('sheet').waitFor()
          await page.getByRole('button', { name: 'Close', exact: true }).click()
          kinds.add(await answer(page))
          await page.getByRole('button', { name: /^Next/ }).waitFor({ timeout: 5000 }).catch(() => { throw new Error(`${name}: the right answer was not accepted`) })
          await next(page)
        }
        await page.getByRole('button', { name: 'Quit', exact: true }).click()
        await page.getByTestId('home').waitFor()
        played.add(id)
      }
      await page.evaluate((ids) => { const s = window.__store; const known = { ...s.getState().profile.fields.known }; for (const id of ids) known[id] = Date.now(); s.update({ known }) }, open)
      for (const id of open) played.add(id)
    }
    assert.equal(played.size, all.length, 'every skill in the graph became reachable')
    for (const k of FULL ? ['number', 'choice', 'decimal', 'fraction'] : ['number', 'choice']) assert.ok(kinds.has(k), `played a ${k} problem`)
    await page.screenshot({ path: 'e2e/shots/home-all.png', fullPage: true })
    await c.close()
  })

  await test('Tryouts: the placement test finds his level in 15 problems and opens the right skills', async () => {
    const c = await newCtx()
    const page = await open(c)
    await page.getByRole('button', { name: /Tryouts/ }).click()
    await page.getByTestId('play').waitFor()
    // he knows everything up through Times Tables and misses what comes after
    const knows = ['Tens Jumps', 'Ones Only', 'Tens & Ones', 'Cross the Ten', 'Bundle a Ten', 'Break a Ten', 'Hundreds Club', 'Groups Of', 'Big Bundles', 'Big Breaks', 'Times 2, 5, 10', 'Times Tables']
    let asked = 0
    while (!(await page.getByTestId('end').count())) {
      const item = page.getByTestId('item')
      if (!(await item.count())) { await page.waitForTimeout(50); continue }
      const before = await page.locator('.lvlname').innerText()
      // answer right only on the ladder skills he "knows"
      const guessRight = await page.evaluate((knows) => { const el = document.querySelector('[data-testid=item]'); return knows.includes(el.getAttribute('data-skill-name')) }, knows)
      await answer(page, guessRight)
      asked++
      // the next problem is up when the title has moved on and the little feedback line is cleared
      await page.waitForFunction((b) => !!document.querySelector('[data-testid=end]') || (document.querySelector('.lvlname')?.textContent !== b && !document.querySelector('[data-testid=feedback]')?.textContent.trim()), before, { timeout: 15000 })
    }
    assert.ok(asked <= 15, `asked ${asked} problems`)
    const end = await page.getByTestId('end').innerText()
    assert.match(end, /Tryouts are done/)
    const known = await page.evaluate(() => Object.keys(window.__store.getState().profile.fields.known))
    assert.ok(known.includes('md.times-2-5-10'), 'placed past the easy times tables')
    assert.ok(!known.includes('md.long-division'), 'not placed past what he missed')
    await page.screenshot({ path: 'e2e/shots/tryouts-end.png' })
    await page.close()
    await c.close()
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
      await page.getByTestId('item').waitFor()
      await answer(page, false)
      await page.waitForTimeout(1000)
      if (!(await page.getByTestId('sheet').count())) await answer(page, false)
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

  await test("Coach's Corner: PIN gate, skill map, lock a skill, export, erase, import restores everything", async () => {
    const page = await open(ctx)
    await page.getByRole('button', { name: /Coach's Corner/ }).click()
    await page.getByTestId('pin').waitFor()
    await pin(page, '14141414') // choose a PIN (entered twice)
    await page.getByTestId('parent').waitFor()
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: /Coach's Corner/ }).click()
    await pin(page, '9999')
    assert.match(await page.getByTestId('pin').innerText(), /does not match/)
    await pin(page, '1414')
    await page.getByTestId('parent').waitFor()
    const body = await page.getByTestId('parent').innerText()
    assert.match(await page.getByTestId('skill-counts').innerText(), /of 165 skills mastered/)
    assert.match(body, /Recent misses/i)
    // tap a skill: details, then lock it
    await page.locator('[data-testid=parent] .smap button', { hasText: 'Ones Only' }).click()
    assert.match(await page.getByTestId('skill-detail').innerText(), /1\.NBT\.C\.4/)
    await page.getByRole('button', { name: 'Lock this skill' }).click()
    assert.match(await page.getByTestId('skill-detail').innerText(), /Locked/)
    await page.getByRole('button', { name: 'Unlock', exact: true }).click()
    const saved = Number(/(\d+) answers saved/.exec(body)[1])
    assert.ok(saved >= 10, `answers saved: ${saved}`)
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
    const ctx2 = await newCtx()
    const p2 = await open(ctx2)
    assert.doesNotMatch(await p2.getByTestId('up-next').innerText(), /Ones Only/)
    await p2.getByRole('button', { name: /Coach's Corner/ }).click()
    await pin(p2, '25802580')
    await p2.getByTestId('parent').waitFor()
    await p2.getByTestId('import-file').setInputFiles(file)
    await p2.getByText(`${saved} answers saved`).waitFor()
    await p2.getByRole('button', { name: 'Back', exact: true }).click()
    assert.match(await p2.getByTestId('up-next').innerText(), /Ones Only/)
    await ctx2.close()
    fs.rmSync(file)
  })

  await test('Ballgame: a full 3-inning game plays start to finish, then shows on the player card', async () => {
    const c = await newCtx()
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

  await test('Ballgame: games with lots of misses, 6-inning games, and games on advanced skills also always finish', async () => {
    for (const [skill, innings, advanced] of [[0.15, 3, false], [0.6, 6, false], [0.8, 3, true]]) {
      const c = await newCtx()
      const page = await open(c)
      if (advanced) {
        // a player far along the graph: everything through grade 4 known, so pitches are fractions, decimals, choices
        await page.evaluate(() => { const s = window.__store; const st = s.getState().derived.board; void st; const known = {}; for (const id of s.skills) if (!/^(al\.(two-step-eq|one-step|like|variables|ineq|ratios|equiv|unit)|ca\.|nv\.neg|fr\.(percent|divide|times-fraction)|md\.(gcf|lcm|exponents))/.test(id)) known[id] = Date.now(); s.update({ known, unlocked: 17 }) })
      }
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
        // A stand-in voice: speaks one word at a steady pace and (optionally) reports each word like Safari does.
        class U { constructor(t) { this.text = t; this.rate = 1 } }
        const synth = {
          getVoices: () => [], cancel() { clearInterval(this.t); this.cur = null }, onvoiceschanged: null,
          speak(u) {
            clearInterval(this.t)
            this.cur = u
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
                  if (this.cur !== u) return
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
        spoken.slice(0, caption.length).forEach(([said, lit], i) => assert.equal(lit, caption[i], `word ${i}: voice said "${said}" but "${lit}" was lit`))
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
      const c = await newCtx({ viewport, hasTouch: true, isMobile: true })
      const page = await open(c)
      const check = async (where) => {
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        assert.ok(over <= 0, `${where}: sideways overflow ${over}px at ${viewport.width}px`)
        const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && (b.offsetWidth < 56 || b.offsetHeight < 56)).map((b) => b.textContent))
        assert.deepEqual(small, [], `${where}: every button is at least 56px`)
      }
      await check('home')
      await page.getByRole('button', { name: /Start climbing/ }).click()
      await page.getByTestId('play').waitFor()
      await page.waitForTimeout(400)
      await check('play')
      if (viewport.width === 390) await page.screenshot({ path: 'e2e/shots/phone-play.png' })
      await c.close()
    }
  })

  assert.deepEqual(errors, [], 'no page errors')
  console.log(`\n${passed} flows passed, no page errors`)
} catch (e) {
  console.error('\nFAILED:', e.message, '\npage errors:', errors.slice(0, 5))
  // leave a picture of whatever was on screen
  let n = 0
  for (const c of browser.contexts()) for (const p of c.pages()) await p.screenshot({ path: `e2e/shots/failure-${n++}.png` }).catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}
