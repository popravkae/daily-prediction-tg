import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { EnergyAura } from './EnergyAura'
import {
  BALL_WIDTH,
  BALL_HEIGHT,
  STAND_WIDTH,
  STAND_HEIGHT,
} from '../constants/ballDimensions'

interface MagicBallProps {
  children?: React.ReactNode
  blurAmount?: number
  scratchProgress?: number // 0-100
}

export const MagicBall = ({ children, blurAmount = 0, scratchProgress = 0 }: MagicBallProps) => {
  const progress = useMotionValue(0)

  useEffect(() => {
    progress.set(scratchProgress)
  }, [scratchProgress, progress])

  // Shake intensity based on progress (90-99% = critical mass)
  const isShaking = scratchProgress >= 90 && scratchProgress < 100
  const shakeIntensity = useMemo(() => {
    if (scratchProgress < 90) return 0
    // Map 90-99 to intensity 0-4
    return Math.min(4, ((scratchProgress - 90) / 10) * 4)
  }, [scratchProgress])

  // Dynamic glow based on progress
  const glowColor = useMemo(() => {
    if (scratchProgress < 30) return 'rgba(0, 150, 255, 0.3)'
    if (scratchProgress < 70) return 'rgba(138, 43, 226, 0.4)'
    if (scratchProgress < 90) return 'rgba(255, 215, 0, 0.5)'
    return 'rgba(255, 255, 255, 0.6)'
  }, [scratchProgress])

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
      <EnergyAura progress={scratchProgress} />

      {/* Outer glow - now reactive to progress */}
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
          duration: scratchProgress >= 70 ? 1.5 : 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />

      {/* Ball and Stand composition */}
      <motion.div
        className="relative flex flex-col items-center"
        animate={isShaking ? {
          // Rumble/Shake effect at 90-99%
          x: [-shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, 0],
          y: [-shakeIntensity * 0.5, shakeIntensity * 0.5, -shakeIntensity * 0.5, 0],
        } : {
          // Normal floating animation
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

          {/* Inner content overlay - positioned in the center of the ball sphere */}
          <div
            className="absolute flex items-center justify-center"
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
            marginTop: 0, // 0px gap between ball and stand
          }}
        />
      </motion.div>
    </motion.div>
  )
}
