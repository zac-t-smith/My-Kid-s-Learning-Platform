# Kailynn's Learning World

A dyslexia-friendly learning platform built with React, Vite, and Tailwind CSS.

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Building for Production

```bash
npm run build
```

The output goes to `dist/` — deploy this folder to Vercel, Netlify, or any static host.

## How to Add a New Subject

1. Create a new page in `src/pages/YourSubject.jsx` using the existing placeholder pages as a template.
2. Add a route in `src/App.jsx`:
   ```jsx
   <Route path="/your-subject" element={<YourSubject />} />
   ```
3. Add a card to the home screen grid in `src/pages/Home.jsx`:
   ```jsx
   <SubjectCard emoji="🎨" title="Art" subtitle="Creative fun" to="/your-subject" />
   ```

## How to Add a New Math Topic

1. Open `src/pages/Math.jsx`.
2. Add an entry to the `topics` array:
   ```js
   { id: 'your-topic', emoji: '🔢', title: 'Your Topic', subtitle: 'Description', to: '/math/your-topic', locked: false }
   ```
3. Create the topic page at `src/pages/YourTopic.jsx`.
4. Add the route in `src/App.jsx`:
   ```jsx
   <Route path="/math/your-topic" element={<YourTopic />} />
   ```

## Design System

- **Font (body):** OpenDyslexic — optimized for readers with dyslexia
- **Font (headings):** Fredoka — rounded and friendly
- **Background:** Deep navy `#1a1a2e`
- **Cards:** `#0f3460`
- **Accents:** Gold `#f5a623`, Mint `#4ecdc4`, Coral `#ff6b6b`, Lavender `#a29bfe`
- **Text:** Cream `#ffeaa7`
- **Min tap target:** 48px (iPad-friendly)

## Progress System

Uses `localStorage` to persist:
- Total stars earned
- Which topics have been visited

Access via the `useProgress` hook in `src/hooks/useProgress.js`.
