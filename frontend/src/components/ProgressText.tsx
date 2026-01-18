import { motion, AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'

interface ProgressTextProps {
  progress: number // 0-100
  isRevealed: boolean
}

// UI Copywriting from the spec (based on % progress)
const getProgressMessage = (progress: number): string => {
  if (progress < 10) return "Ну, почнемо магію..."
  if (progress < 40) return "Ого, пішло тепло!"
  if (progress < 70) return "Блищить, як лисина у Він Дізеля!"
  if (progress < 90) return "Тільки не протри до зірок!"
  if (progress < 100) return "Завантаження магії... 99%..."
  return ""
}

// Text color based on energy phase
const getTextColor = (progress: number): string => {
  if (progress < 30) return 'text-blue-300' // Blue phase
  if (progress < 70) return 'text-purple-300' // Purple phase
  if (progress < 90) return 'text-yellow-300' // Gold phase
  return 'text-white' // Critical mass - white
}

export const ProgressText = ({ progress, isRevealed }: ProgressTextProps) => {
  const message = useMemo(() => getProgressMessage(progress), [progress])
  const colorClass = useMemo(() => getTextColor(progress), [progress])

  // Don't show text after reveal
  if (isRevealed || progress >= 100) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        className={`text-center px-4 py-2 ${colorClass}`}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          // Add shake effect for critical mass text
          x: progress >= 90 ? [-2, 2, -2, 2, 0] : 0,
        }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        transition={{
          opacity: { duration: 0.3 },
          y: { duration: 0.3 },
          scale: { type: 'spring', stiffness: 300, damping: 20 },
          x: progress >= 90 ? { duration: 0.3, repeat: Infinity } : undefined,
        }}
      >
        <p
          className="text-lg font-medium drop-shadow-lg"
          style={{
            textShadow: progress >= 70
              ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)'
              : '0 0 10px rgba(0, 0, 0, 0.5)',
          }}
        >
          {message}
        </p>

        {/* Progress percentage indicator */}
        <motion.div
          className="mt-2 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="h-1 w-24 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: progress < 30
                  ? 'linear-gradient(90deg, #60a5fa, #3b82f6)' // Blue
                  : progress < 70
                    ? 'linear-gradient(90deg, #a78bfa, #8b5cf6)' // Purple
                    : progress < 90
                      ? 'linear-gradient(90deg, #fde047, #eab308)' // Yellow/Gold
                      : 'linear-gradient(90deg, #ffffff, #fde047)', // White/Gold
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs text-white/60 font-mono">
            {Math.round(progress)}%
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
