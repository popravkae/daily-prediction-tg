import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SCRATCH_SIZE } from '../constants/ballDimensions'

interface ScratchLayerProps {
  onReveal: () => void
  onProgress?: (progress: number) => void
  revealThreshold?: number
}

export const ScratchLayer = ({ onReveal, onProgress, revealThreshold = 50 }: ScratchLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scratchProgress, setScratchProgress] = useState(0)
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

    // Считаем только пиксели внутри круга
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - centerX
        const dy = y - centerY
        if (dx * dx + dy * dy <= radius * radius) {
          totalInCircle++
          const i = (y * size + x) * 4 + 3 // alpha channel
          if (pixels[i] === 0) transparent++
        }
      }
    }

    return totalInCircle > 0 ? (transparent / totalInCircle) * 100 : 0
  }, [])

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas || isRevealed) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const canvasX = (x - rect.left) * (canvas.width / rect.width)
    const canvasY = (y - rect.top) * (canvas.height / rect.height)

    // Проверяем, что точка внутри круга
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = canvas.width / 2
    const dx = canvasX - centerX
    const dy = canvasY - centerY
    if (dx * dx + dy * dy > radius * radius) return

    ctx.globalCompositeOperation = 'destination-out'

    // Draw scratching line
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(canvasX, canvasY)
    ctx.lineWidth = 45
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Also draw a circle at current position
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, 22, 0, Math.PI * 2)
    ctx.fill()

    lastPosRef.current = { x: canvasX, y: canvasY }

    // Trigger haptic feedback
    triggerHaptic()

    // Check reveal percentage
    const percentage = calculateRevealPercentage(ctx, canvas.width)
    setScratchProgress(percentage)
    onProgress?.(percentage)

    if (percentage >= revealThreshold && !isRevealed) {
      setIsRevealed(true)
      onReveal()
    }
  }, [isRevealed, onReveal, onProgress, revealThreshold, triggerHaptic, calculateRevealPercentage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Круглый canvas по размеру шара
    canvas.width = SCRATCH_SIZE
    canvas.height = SCRATCH_SIZE

    const centerX = SCRATCH_SIZE / 2
    const centerY = SCRATCH_SIZE / 2
    const radius = SCRATCH_SIZE / 2

    // Рисуем полупрозрачный слой для блюра (легкий эффект тумана)
    // Этот слой стирается пользователем, открывая четкое изображение под ним
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200, 180, 220, 0.35)' // Легкий фиолетовый оттенок
    ctx.fill()
  }, [])

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

  return (
    <AnimatePresence>
      {!isRevealed && (
        <motion.div
          className="absolute pointer-events-auto"
          style={{
            // Центрируем круг в области шара
            // Ball: 320x308, Stand: 359x110, Total container: 359x418
            // Ball starts at top of the container, centered horizontally
            top: 14, // небольшой отступ от верха шара
            left: '50%',
            transform: 'translateX(-50%)',
            width: SCRATCH_SIZE,
            height: SCRATCH_SIZE,
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Canvas для стирания - круглый слой блюра поверх шара */}
            {/* Стирание убирает блюр, открывая четкое изображение */}
            <canvas
              ref={canvasRef}
              className="cursor-pointer touch-none absolute"
              style={{
                width: SCRATCH_SIZE,
                height: SCRATCH_SIZE,
                borderRadius: '50%',
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

            {/* Hint text */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: scratchProgress < 10 ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-white/90 text-base font-medium text-center px-4 drop-shadow-lg">
                Потри кришталеву кулю
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
