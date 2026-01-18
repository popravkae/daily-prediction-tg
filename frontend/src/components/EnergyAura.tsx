import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useEffect, useMemo } from 'react'

interface EnergyAuraProps {
  progress: number // 0-100
}

export const EnergyAura = ({ progress }: EnergyAuraProps) => {
  const motionProgress = useMotionValue(0)

  // Update motion value when progress changes
  useEffect(() => {
    motionProgress.set(progress)
  }, [progress, motionProgress])

  // Transform progress to various properties
  // 0-30%: Blue, Low Opacity (0.2), Slow Rotation
  // 30-70%: Purple, Medium Opacity (0.6), Rotation speed doubles
  // 70-90%: Gold/White, High Opacity (1.0), Fast Rotation, Pulsing Scale
  // 90-99%: Critical Mass - Rumble/Shake

  const opacity = useTransform(motionProgress, [0, 30, 70, 90], [0.2, 0.4, 0.8, 1.0])
  const scale = useTransform(motionProgress, [0, 30, 70, 90, 100], [1, 1.05, 1.15, 1.25, 1.3])

  // Spring for smooth, bouncy scale
  const springScale = useSpring(scale, {
    stiffness: 200,
    damping: 20,
    mass: 1
  })

  // Calculate rotation speed based on progress
  const rotationDuration = useMemo(() => {
    if (progress < 30) return 8 // Slow
    if (progress < 70) return 4 // Medium
    if (progress < 90) return 2 // Fast
    return 1 // Very fast
  }, [progress])

  // Color gradient based on progress
  const getGradientColors = () => {
    if (progress < 30) {
      // Blue phase
      return {
        inner: 'rgba(0, 150, 255, 0.3)',
        outer: 'rgba(0, 100, 200, 0.1)'
      }
    } else if (progress < 70) {
      // Purple phase
      return {
        inner: 'rgba(138, 43, 226, 0.5)',
        outer: 'rgba(75, 0, 130, 0.2)'
      }
    } else {
      // Gold/White phase
      return {
        inner: 'rgba(255, 215, 0, 0.7)',
        outer: 'rgba(255, 255, 255, 0.3)'
      }
    }
  }

  const colors = getGradientColors()

  // Pulsing effect for high progress
  const shouldPulse = progress >= 70

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        scale: springScale,
        opacity,
      }}
    >
      {/* Outer aura ring */}
      <motion.div
        className="absolute -inset-12"
        style={{
          background: `radial-gradient(circle, ${colors.inner} 0%, ${colors.outer} 50%, transparent 70%)`,
          borderRadius: '50%',
        }}
        animate={{
          rotate: 360,
          scale: shouldPulse ? [1, 1.08, 1] : 1,
        }}
        transition={{
          rotate: {
            duration: rotationDuration,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: shouldPulse ? {
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          } : undefined,
        }}
      />

      {/* Inner glow ring */}
      <motion.div
        className="absolute -inset-6"
        style={{
          background: `radial-gradient(circle, ${colors.inner} 0%, transparent 60%)`,
          borderRadius: '50%',
          filter: 'blur(8px)',
        }}
        animate={{
          rotate: -360,
          opacity: shouldPulse ? [0.5, 1, 0.5] : 0.6,
        }}
        transition={{
          rotate: {
            duration: rotationDuration * 1.5,
            repeat: Infinity,
            ease: 'linear',
          },
          opacity: shouldPulse ? {
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          } : undefined,
        }}
      />

      {/* Energy particles for high progress */}
      {progress >= 70 && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: progress >= 90 ? '#ffd700' : '#8a2be2',
                boxShadow: `0 0 10px ${progress >= 90 ? '#ffd700' : '#8a2be2'}`,
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos((i * 60) * Math.PI / 180) * 160, 0],
                y: [0, Math.sin((i * 60) * Math.PI / 180) * 160, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}

      {/* Critical mass effect - sparks */}
      {progress >= 90 && (
        <>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`spark-${i}`}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{
                left: '50%',
                top: '50%',
                boxShadow: '0 0 6px #fff, 0 0 12px #ffd700',
              }}
              animate={{
                x: [0, Math.cos((i * 30) * Math.PI / 180) * (100 + Math.random() * 60)],
                y: [0, Math.sin((i * 30) * Math.PI / 180) * (100 + Math.random() * 60)],
                opacity: [1, 0],
                scale: [1, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.08,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  )
}
