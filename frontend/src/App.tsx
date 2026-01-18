import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  InteractiveBackground,
  MagicBall,
  Loader,
  ShareButton,
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

  // Explosion confetti from the center (as per spec)
  const explodeConfetti = useCallback(() => {
    // First burst - center explosion
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.45 }, // Center of the ball
      colors: ['#7b2cbf', '#00d4ff', '#ffd700', '#ff6b6b', '#ffffff'],
      startVelocity: 45,
      gravity: 0.8,
    })

    // Second burst - delayed for effect
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 120,
        origin: { x: 0.5, y: 0.45 },
        colors: ['#ffd700', '#ffffff', '#00d4ff'],
        startVelocity: 35,
      })
    }, 100)

    // Side confetti streams
    const duration = 2000
    const end = Date.now() + duration

    const colors = ['#7b2cbf', '#00d4ff', '#ffd700', '#ff6b6b']

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }

    frame()
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

    // 4. Change phase to revealed
    setPhase('revealed')

    // 5. Show prediction bubble after a short delay
    setTimeout(() => setShowBubble(true), 600)
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
        <p className="text-sm text-white/50 mt-1">ANC Pharmacy</p>
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

          {(phase === 'interactive' || phase === 'revealed') && (
            <motion.div
              key="main"
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Progress text messages - above the ball */}
              {phase === 'interactive' && (
                <div className="mb-4">
                  <ProgressText progress={scratchProgress} isRevealed={false} />
                </div>
              )}

              {/* Magic Ball with integrated scratch layer */}
              <div className="relative">
                <MagicBall
                  scratchProgress={scratchProgress}
                  isInteractive={phase === 'interactive'}
                  onProgress={setScratchProgress}
                  onReveal={handleReveal}
                >
                  <AnimatePresence>
                    {phase === 'revealed' && (
                      <motion.p
                        className="prediction-text"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        {prediction}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </MagicBall>
              </div>

              {/* Share button (only after reveal) */}
              <AnimatePresence>
                {phase === 'revealed' && (
                  <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <ShareButton prediction={prediction} />
                  </motion.div>
                )}
              </AnimatePresence>
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
