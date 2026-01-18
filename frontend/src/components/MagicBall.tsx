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

    // Check if within ball circle (slightly smaller to avoid edges)
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(canvas.width, canvas.height) / 2 - 15
    const dx = canvasX - centerX
    const dy = canvasY - centerY
    if (dx * dx + dy * dy > radius * radius) return

    ctx.globalCompositeOperation = 'destination-out'

    // Draw scratch line
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(canvasX, canvasY)
    ctx.lineWidth = 50
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Draw scratch circle at current position
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, 25, 0, Math.PI * 2)
    ctx.fill()

    lastPosRef.current = { x: canvasX, y: canvasY }
    triggerHaptic()

    const percentage = calculateRevealPercentage(ctx, Math.min(canvas.width, canvas.height))
    setLocalProgress(percentage)
    onProgress?.(percentage)

    if (percentage >= revealThreshold && !isRevealed) {
      setIsRevealed(true)
      onReveal?.()
    }
  }, [isRevealed, isInteractive, onReveal, onProgress, revealThreshold, triggerHaptic, calculateRevealPercentage])

  const blurredImageRef = useRef<HTMLImageElement | null>(null)

  // Load blurred ball image into canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isInteractive) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match ball
    canvas.width = BALL_WIDTH
    canvas.height = BALL_HEIGHT

    // Load ball image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      blurredImageRef.current = img

      // Create offscreen canvas for blur
      const offscreen = document.createElement('canvas')
      offscreen.width = BALL_WIDTH
      offscreen.height = BALL_HEIGHT
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) return

      // Draw blurred image
      offCtx.filter = 'blur(8px) brightness(1.15)'
      offCtx.drawImage(img, 0, 0, BALL_WIDTH, BALL_HEIGHT)

      // Draw to main canvas
      ctx.drawImage(offscreen, 0, 0)

      // Add frosted overlay
      const centerX = BALL_WIDTH / 2
      const centerY = BALL_HEIGHT / 2
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, BALL_WIDTH / 2)
      gradient.addColorStop(0, 'rgba(220, 200, 240, 0.35)')
      gradient.addColorStop(0.7, 'rgba(200, 180, 220, 0.4)')
      gradient.addColorStop(1, 'rgba(180, 160, 200, 0.2)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, BALL_WIDTH / 2 - 10, 0, Math.PI * 2)
      ctx.fill()
    }
    img.src = '/images/ball.svg'
  }, [isInteractive, BALL_WIDTH, BALL_HEIGHT])

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
        {/* Ball container with scratch overlay */}
        <div className="relative" style={{ width: BALL_WIDTH, height: BALL_HEIGHT }}>
          {/* Layer 1: Clear ball (always visible underneath) */}
          <img
            src="/images/ball.svg"
            alt="Magic Ball"
            className="w-full h-full object-contain absolute inset-0"
          />

          {/* Layer 2: Canvas with blurred ball - scratches reveal clear ball underneath */}
          {isInteractive && !isRevealed && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-pointer touch-none"
              style={{
                width: BALL_WIDTH,
                height: BALL_HEIGHT,
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
          )}

          {/* Hint text */}
          {isInteractive && !isRevealed && (
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
          )}

          {/* Inner content overlay */}
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
