import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  InteractiveBackground,
  MagicBall,
  Stand,
  ScratchLayer,
  Loader,
  ShareButton
} from './components'

type AppPhase = 'loading' | 'interactive' | 'revealed'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [phase, setPhase] = useState<AppPhase>('loading')
  const [prediction, setPrediction] = useState<string>('')
  const [error, setError] = useState<string>('')

  const getTelegram = () => window.Telegram?.WebApp

  const triggerSuccessHaptic = useCallback(() => {
    try {
      getTelegram()?.HapticFeedback?.notificationOccurred('success')
    } catch {
      // Haptic not available
    }
  }, [])

  const explodeConfetti = useCallback(() => {
    const duration = 3000
    const end = Date.now() + duration

    const colors = ['#7b2cbf', '#00d4ff', '#ffd700', '#ff6b6b']

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors
      })
      confetti({
        particleCount: 3,
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
    setPhase('revealed')
    triggerSuccessHaptic()
    explodeConfetti()
  }, [triggerSuccessHaptic, explodeConfetti])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      <InteractiveBackground />

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
              {/* Magic Ball with scratch layer */}
              <div className="relative">
                <MagicBall>
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

                {/* Scratch layer overlay */}
                {phase === 'interactive' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScratchLayer onReveal={handleReveal} />
                  </div>
                )}
              </div>

              {/* Stand */}
              <Stand />

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
