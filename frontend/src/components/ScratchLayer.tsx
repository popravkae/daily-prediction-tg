import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface ScratchLayerProps {
  onReveal: () => void
  revealThreshold?: number
}

export const ScratchLayer = ({ onReveal, revealThreshold = 60 }: ScratchLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  const calculateRevealPercentage = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height)
    const pixels = imageData.data
    let transparent = 0

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++
    }

    return (transparent / (pixels.length / 4)) * 100
  }, [])

  const generateFogTexture = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Create procedural fog using multiple layers
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    )
    gradient.addColorStop(0, 'rgba(123, 44, 191, 0.9)')
    gradient.addColorStop(0.5, 'rgba(75, 20, 120, 0.95)')
    gradient.addColorStop(1, 'rgba(26, 10, 46, 1)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add noise particles for texture
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = Math.random() * 3
      const alpha = Math.random() * 0.3

      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200, 180, 255, ${alpha})`
      ctx.fill()
    }

    // Add swirl patterns
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const radius = 20 + Math.random() * 60

      const swirlGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      swirlGradient.addColorStop(0, 'rgba(0, 212, 255, 0.15)')
      swirlGradient.addColorStop(0.5, 'rgba(123, 44, 191, 0.1)')
      swirlGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = swirlGradient
      ctx.fill()
    }
  }, [])

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || isRevealed) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = (x - rect.left) * (canvas.width / rect.width)
    const canvasY = (y - rect.top) * (canvas.height / rect.height)

    ctx.globalCompositeOperation = 'destination-out'

    // Draw scratching line
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(canvasX, canvasY)
    ctx.lineWidth = 50
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Also draw a circle at current position
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, 25, 0, Math.PI * 2)
    ctx.fill()

    lastPosRef.current = { x: canvasX, y: canvasY }

    // Trigger haptic feedback
    triggerHaptic()

    // Check reveal percentage
    const percentage = calculateRevealPercentage(ctx, canvas.width, canvas.height)
    if (percentage >= revealThreshold && !isRevealed) {
      setIsRevealed(true)
      onReveal()
    }
  }, [isRevealed, onReveal, revealThreshold, triggerHaptic, calculateRevealPercentage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 320
    canvas.height = 320

    generateFogTexture(ctx, canvas.width, canvas.height)
  }, [generateFogTexture])

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

  if (isRevealed) return null

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-full cursor-pointer touch-none"
          style={{ width: 280, height: 280 }}
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

        {/* Hint text */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-white/70 text-lg font-medium text-center px-8">
            Потри кришталеву кулю
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}
