import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useEffect, useMemo, useRef, useCallback, useState } from 'react'
import { EnergyAura } from './EnergyAura'
import {
  BALL_WIDTH,
  BALL_HEIGHT,
  STAND_WIDTH,
  STAND_HEIGHT,
} from '../constants/ballDimensions'

interface MagicBallProps {
  children?: React.ReactNode
  scratchProgress?: number // 0-100
  isInteractive?: boolean
  onProgress?: (progress: number) => void
  onReveal?: () => void
  revealThreshold?: number
}

export const MagicBall = ({
  children,
  scratchProgress = 0,
  isInteractive = false,
  onProgress,
  onReveal,
  revealThreshold = 50
}: MagicBallProps) => {
  const progress = useMotionValue(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [localProgress, setLocalProgress] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  // Scratch canvas size matches ball sphere area
  const SCRATCH_DIAMETER = BALL_WIDTH - 20

  const getTelegram = () => window.Telegram?.WebApp

  const triggerHaptic = useCallback(() => {
    try {
      getTelegram()?.HapticFeedback?.impactOccurred('light')
    } catch {
      // Haptic not available
    }
  }, [])

  const calculateRevealPercentage = useCallback((ctx: CanvasRenderingContext2D, size: number) => {
    const imageData = ctx.getImageData(0, 0, size, size)
    const pixels = imageData.data
    let transparent = 0
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2
    let totalInCircle = 0

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX
        const dy = y - centerY
        if (dx * dx + dy * dy <= radius * radius) {
          totalInCircle++
          const i = (y * size + x) * 4 + 3
          if (pixels[i] === 0) transparent++
        }
      }
    }

    return totalInCircle > 0 ? (transparent / totalInCircle) * 100 : 0
  }, [])

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || isRevealed || !isInteractive) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = (x - rect.left) * (canvas.width / rect.width)
    const canvasY = (y - rect.top) * (canvas.height / rect.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = canvas.width / 2
    const dx = canvasX - centerX
    const dy = canvasY - centerY
    if (dx * dx + dy * dy > radius * radius) return

    ctx.globalCompositeOperation = 'destination-out'

    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(canvasX, canvasY)
    ctx.lineWidth = 45
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(canvasX, canvasY, 22, 0, Math.PI * 2)
    ctx.fill()

    lastPosRef.current = { x: canvasX, y: canvasY }
    triggerHaptic()

    const percentage = calculateRevealPercentage(ctx, canvas.width)
    setLocalProgress(percentage)
    onProgress?.(percentage)

    if (percentage >= revealThreshold && !isRevealed) {
      setIsRevealed(true)
      onReveal?.()
    }
  }, [isRevealed, isInteractive, onReveal, onProgress, revealThreshold, triggerHaptic, calculateRevealPercentage])

  // Initialize scratch canvas with blur layer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isInteractive) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = SCRATCH_DIAMETER
    canvas.height = SCRATCH_DIAMETER

    const centerX = SCRATCH_DIAMETER / 2
    const centerY = SCRATCH_DIAMETER / 2
    const radius = SCRATCH_DIAMETER / 2

    // Draw frosted glass effect
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200, 180, 220, 0.5)'
    ctx.fill()
  }, [isInteractive, SCRATCH_DIAMETER])

  const handleStart = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    lastPosRef.current = {
      x: (x - rect.left) * (canvas.width / rect.width),
      y: (y - rect.top) * (canvas.height / rect.height)
    }
    isDrawingRef.current = true
  }

  const handleMove = (x: number, y: number) => {
    if (!isDrawingRef.current) return
    scratch(x, y)
  }

  const handleEnd = () => {
    isDrawingRef.current = false
  }

  // Use local progress if interactive, otherwise use prop
  const currentProgress = isInteractive ? localProgress : scratchProgress

  useEffect(() => {
    progress.set(currentProgress)
  }, [currentProgress, progress])

  // Shake intensity based on progress (90-99% = critical mass)
  const isShaking = currentProgress >= 90 && currentProgress < 100
  const shakeIntensity = useMemo(() => {
    if (currentProgress < 90) return 0
    return Math.min(4, ((currentProgress - 90) / 10) * 4)
  }, [currentProgress])

  // Dynamic glow based on progress
  const glowColor = useMemo(() => {
    if (currentProgress < 30) return 'rgba(0, 150, 255, 0.3)'
    if (currentProgress < 70) return 'rgba(138, 43, 226, 0.4)'
    if (currentProgress < 90) return 'rgba(255, 215, 0, 0.5)'
    return 'rgba(255, 255, 255, 0.6)'
  }, [currentProgress])

  // Calculate blur amount based on progress
  const blurAmount = isInteractive && !isRevealed
    ? Math.max(0, 12 - (currentProgress / 100) * 12)
    : 0

  const glowScale = useTransform(progress, [0, 50, 100], [1, 1.15, 1.25])
  const springGlowScale = useSpring(glowScale, { stiffness: 150, damping: 20 })

  // Total height = ball + stand (0px gap)
  const totalHeight = BALL_HEIGHT + STAND_HEIGHT

  return (
    <motion.div
      className="relative flex flex-col items-center"
      style={{ width: STAND_WIDTH, height: totalHeight }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Energy Aura - behind the ball */}
      <EnergyAura progress={currentProgress} />

      {/* Outer glow - reactive to progress */}
      <motion.div
        className="absolute"
        style={{
          top: -32,
          left: (STAND_WIDTH - BALL_WIDTH) / 2 - 32,
          width: BALL_WIDTH + 64,
          height: BALL_HEIGHT + 64,
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          scale: springGlowScale,
        }}
        animate={{
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: currentProgress >= 70 ? 1.5 : 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Ball and Stand composition */}
      <motion.div
        className="relative flex flex-col items-center"
        animate={isShaking ? {
          x: [-shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, 0],
          y: [-shakeIntensity * 0.5, shakeIntensity * 0.5, -shakeIntensity * 0.5, 0],
        } : {
          y: [0, -6, 0],
          x: 0,
        }}
        transition={isShaking ? {
          duration: 0.15,
          repeat: Infinity,
          ease: 'linear',
        } : {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {/* Ball SVG - with blur that gets scratched away */}
        <div className="relative" style={{ width: BALL_WIDTH, height: BALL_HEIGHT }}>
          <img
            src="/images/ball.svg"
            alt="Magic Ball"
            className="w-full h-full object-contain transition-all duration-300"
            style={{ filter: `blur(${blurAmount}px)` }}
          />

          {/* Scratch canvas - positioned over the ball sphere, moves with the ball */}
          {isInteractive && !isRevealed && (
            <motion.div
              className="absolute pointer-events-auto"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: SCRATCH_DIAMETER,
                height: SCRATCH_DIAMETER,
              }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
            >
              <canvas
                ref={canvasRef}
                className="cursor-pointer touch-none absolute rounded-full"
                style={{
                  width: SCRATCH_DIAMETER,
                  height: SCRATCH_DIAMETER,
                }}
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => {
                  e.preventDefault()
                  const touch = e.touches[0]
                  handleStart(touch.clientX, touch.clientY)
                }}
                onTouchMove={(e) => {
                  e.preventDefault()
                  const touch = e.touches[0]
                  handleMove(touch.clientX, touch.clientY)
                }}
                onTouchEnd={handleEnd}
              />

              {/* Hint text - inside scratch area */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: currentProgress < 10 ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-white/90 text-base font-medium text-center px-4 drop-shadow-lg">
                  Потри кришталеву кулю
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Inner content overlay - positioned in the center of the ball sphere */}
          <div
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              top: '5%',
              left: '8%',
              width: '84%',
              height: '84%'
            }}
          >
            <div className="relative z-10 w-full h-full flex items-center justify-center p-4 text-center">
              {children}
            </div>
          </div>
        </div>

        {/* Stand SVG - no blur, positioned directly under the ball with 0px gap */}
        <img
          src="/images/stand.svg"
          alt="Stand"
          className="object-contain"
          style={{
            width: STAND_WIDTH,
            height: STAND_HEIGHT,
            marginTop: 0,
          }}
        />
      </motion.div>
    </motion.div>
  )
}
