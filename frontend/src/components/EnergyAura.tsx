import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { BALL_WIDTH, BALL_HEIGHT } from '../constants/ballDimensions'

interface EnergyAuraProps {
  progress: number // 0-100
}

export const EnergyAura = ({ progress }: EnergyAuraProps) => {
  const motionProgress = useMotionValue(0)

  // Update motion value when progress changes
  useEffect(() => {
    motionProgress.set(progress)
  }, [progress, motionProgress])

  // Transform progress to opacity using useTransform
  const opacity = useTransform(motionProgress, [0, 30, 70, 90], [0.3, 0.5, 0.8, 1.0])
  const scale = useTransform(motionProgress, [0, 30, 70, 90, 100], [1, 1.05, 1.15, 1.25, 1.3])

  // Spring for smooth, bouncy scale
  const springScale = useSpring(scale, {
    stiffness: 200,
    damping: 20,
    mass: 1
  })

  // Calculate rotation speed based on progress
  const rotationDuration = useMemo(() => {
    if (progress < 30) return 10 // Slow
    if (progress < 70) return 5 // Medium
    if (progress < 90) return 2.5 // Fast
    return 1.2 // Very fast
  }, [progress])

  // Get phase-based colors
  const phase = useMemo(() => {
    if (progress < 30) return 'blue'
    if (progress < 70) return 'purple'
    if (progress < 90) return 'gold'
    return 'critical'
  }, [progress])

  // Color configurations for each phase
  const colors = useMemo(() => {
    switch (phase) {
      case 'blue':
        return {
          primary: 'rgba(0, 180, 255, 0.5)',
          secondary: 'rgba(0, 100, 200, 0.3)',
          glow: 'rgba(0, 150, 255, 0.4)',
          particle: '#00b4ff'
        }
      case 'purple':
        return {
          primary: 'rgba(147, 51, 234, 0.6)',
          secondary: 'rgba(88, 28, 135, 0.4)',
          glow: 'rgba(147, 51, 234, 0.5)',
          particle: '#9333ea'
        }
      case 'gold':
        return {
          primary: 'rgba(255, 200, 0, 0.7)',
          secondary: 'rgba(255, 150, 0, 0.5)',
          glow: 'rgba(255, 215, 0, 0.6)',
          particle: '#ffd700'
        }
      case 'critical':
        return {
          primary: 'rgba(255, 255, 255, 0.8)',
          secondary: 'rgba(255, 215, 0, 0.6)',
          glow: 'rgba(255, 255, 255, 0.7)',
          particle: '#ffffff'
        }
    }
  }, [phase])

  // Pulsing effect for high progress
  const shouldPulse = progress >= 70
  const isCritical = progress >= 90

  // Aura size based on ball dimensions
  const auraSize = Math.max(BALL_WIDTH, BALL_HEIGHT) + 80

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: auraSize,
        height: auraSize,
        left: '50%',
        top: BALL_HEIGHT / 2,
        transform: 'translate(-50%, -50%)',
        scale: springScale,
        opacity,
      }}
    >
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from 0deg, ${colors.primary}, transparent, ${colors.secondary}, transparent, ${colors.primary})`,
          borderRadius: '50%',
          filter: 'blur(20px)',
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          rotate: {
            duration: rotationDuration,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      />

      {/* Middle pulsing glow */}
      <motion.div
        className="absolute inset-4"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
        animate={{
          scale: shouldPulse ? [1, 1.15, 1] : 1,
          opacity: shouldPulse ? [0.6, 1, 0.6] : 0.5,
        }}
        transition={{
          duration: isCritical ? 0.4 : 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner counter-rotating ring */}
      <motion.div
        className="absolute inset-8"
        style={{
          background: `conic-gradient(from 180deg, transparent, ${colors.secondary}, transparent, ${colors.primary}, transparent)`,
          borderRadius: '50%',
          filter: 'blur(15px)',
        }}
        animate={{
          rotate: -360,
        }}
        transition={{
          rotate: {
            duration: rotationDuration * 1.3,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      />

      {/* Energy particles - appear at 30%+ */}
      {progress >= 30 && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: progress >= 70 ? 8 : 6,
                height: progress >= 70 ? 8 : 6,
                background: colors.particle,
                boxShadow: `0 0 ${progress >= 70 ? 15 : 10}px ${colors.particle}`,
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos((i * 45) * Math.PI / 180) * (auraSize / 2 - 20), 0],
                y: [0, Math.sin((i * 45) * Math.PI / 180) * (auraSize / 2 - 20), 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: progress >= 70 ? 1.2 : 2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}

      {/* Critical mass sparks - 90%+ */}
      {isCritical && (
        <>
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={`spark-${i}`}
              className="absolute rounded-full"
              style={{
                width: 3,
                height: 3,
                background: '#ffffff',
                boxShadow: '0 0 8px #fff, 0 0 16px #ffd700',
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos((i * 22.5) * Math.PI / 180) * (80 + Math.random() * 40)],
                y: [0, Math.sin((i * 22.5) * Math.PI / 180) * (80 + Math.random() * 40)],
                opacity: [1, 0],
                scale: [1, 0.3],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.05,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Lightning bolts effect */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`bolt-${i}`}
              className="absolute"
              style={{
                width: 2,
                height: 40,
                background: 'linear-gradient(to bottom, #ffffff, transparent)',
                left: '50%',
                top: '50%',
                transformOrigin: 'top center',
                rotate: i * 90,
              }}
              animate={{
                opacity: [0, 1, 0],
                scaleY: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  )
}
