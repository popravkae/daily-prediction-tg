import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  InteractiveBackground,
  MagicBall,
  Loader,
  ProgressText,
  PredictionBubble
} from './components'

type AppPhase = 'loading' | 'interactive' | 'revealed'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [phase, setPhase] = useState<AppPhase>('loading')
  const [prediction, setPrediction] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [scratchProgress, setScratchProgress] = useState(0)
  const [showFlash, setShowFlash] = useState(false)
  const [showBubble, setShowBubble] = useState(false)

  const getTelegram = () => window.Telegram?.WebApp

  const triggerSuccessHaptic = useCallback(() => {
    try {
      getTelegram()?.HapticFeedback?.notificationOccurred('success')
    } catch {
      // Haptic not available
    }
  }, [])

  // Quick explosion confetti - appears fast and disappears behind popup
  const explodeConfetti = useCallback(() => {
    // Single powerful burst - quick explosion
    confetti({
      particleCount: 150,
      spread: 360,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#7b2cbf', '#00d4ff', '#ffd700', '#ff6b6b', '#ffffff'],
      startVelocity: 50,
      gravity: 1.5, // Fast fall
      decay: 0.95,
      ticks: 80, // Short lifetime
      zIndex: 40, // Behind popup (z-50)
    })
  }, [])

  const fetchPrediction = useCallback(async () => {
    try {
      const telegram = getTelegram()
      const initData = telegram?.initData || ''

      // If no initData (testing outside Telegram), use mock data
      const body = initData
        ? { initData }
        : { initData: 'user=' + encodeURIComponent(JSON.stringify({ id: 12345, first_name: 'Test' })) }

      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to fetch prediction')
      }

      const data = await response.json()
      setPrediction(data.prediction)
      setPhase('interactive')
    } catch (err) {
      console.error('Error fetching prediction:', err)
      setError('Не вдалося отримати пророцтво. Спробуйте пізніше.')
      // Use fallback prediction
      setPrediction('Зірки кажуть: сьогодні вітамін С - твій найкращий друг!')
      setPhase('interactive')
    }
  }, [])

  useEffect(() => {
    // Initialize Telegram WebApp
    const telegram = getTelegram()
    if (telegram) {
      telegram.ready()
      telegram.expand()
    }

    // Fetch prediction
    fetchPrediction()
  }, [fetchPrediction])

  const handleReveal = useCallback(() => {
    // 1. Flash the screen white briefly
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 150)

    // 2. Trigger success haptic
    triggerSuccessHaptic()

    // 3. Explode confetti from center
    explodeConfetti()

    // 4. Change phase to revealed (ball disappears)
    setPhase('revealed')

    // 5. Show prediction bubble immediately after flash
    setTimeout(() => setShowBubble(true), 200)
  }, [triggerSuccessHaptic, explodeConfetti])

  const handleCloseBubble = useCallback(() => {
    setShowBubble(false)
  }, [])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      <InteractiveBackground />

      {/* White flash effect on reveal */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            className="fixed inset-0 bg-white z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        className="absolute top-8 left-0 right-0 text-center z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-2xl font-bold text-white/90">
          Пророцтво дня
        </h1>
      </motion.div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center z-10">
        <AnimatePresence mode="wait">
          {phase === 'loading' && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader />
            </motion.div>
          )}

          {phase === 'interactive' && (
            <motion.div
              key="main"
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Progress text messages - above the ball */}
              <div className="mb-4">
                <ProgressText progress={scratchProgress} isRevealed={false} />
              </div>

              {/* Magic Ball with integrated scratch layer */}
              <div className="relative">
                <MagicBall
                  scratchProgress={scratchProgress}
                  isInteractive={true}
                  onProgress={setScratchProgress}
                  onReveal={handleReveal}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prediction Bubble (popup after reveal) */}
      <AnimatePresence>
        {showBubble && (
          <PredictionBubble prediction={prediction} onClose={handleCloseBubble} />
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute bottom-8 left-4 right-4 glass p-4 text-center text-red-300 text-sm z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
