import { Routes, Route, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Math from './pages/Math'
import Division from './pages/Division'
import Spelling from './pages/Spelling'
import Reading from './pages/Reading'
import Progress from './pages/Progress'

export default function App() {
  const location = useLocation()
  const showNav = location.pathname !== '/'

  return (
    <div className="min-h-screen pb-12 relative">
      <div className="sparkle-bg" />
      {showNav && <NavBar />}
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/math" element={<Math />} />
          <Route path="/math/division" element={<Division />} />
          <Route path="/spelling" element={<Spelling />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/progress" element={<Progress />} />
        </Routes>
      </main>
    </div>
  )
}
