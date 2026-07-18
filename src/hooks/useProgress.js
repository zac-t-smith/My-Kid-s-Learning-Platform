import { useState, useEffect } from 'react'

const STORAGE_KEY = 'kailyns-learning-progress'

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { stars: 0, visited: [] }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useProgress() {
  const [progress, setProgress] = useState(loadProgress)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  function addStars(count) {
    setProgress(prev => ({ ...prev, stars: prev.stars + count }))
  }

  function markVisited(topicId) {
    setProgress(prev => {
      if (prev.visited.includes(topicId)) return prev
      return { ...prev, visited: [...prev.visited, topicId] }
    })
  }

  function hasVisited(topicId) {
    return progress.visited.includes(topicId)
  }

  return {
    stars: progress.stars,
    visited: progress.visited,
    addStars,
    markVisited,
    hasVisited,
  }
}
