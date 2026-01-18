import { motion } from 'framer-motion'

export const Stand = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative -mt-4"
    >
      <svg
        width="200"
        height="80"
        viewBox="0 0 200 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main stand body */}
        <defs>
          {/* Golden gradient */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="25%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#B8860B" />
            <stop offset="75%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFE066" />
          </linearGradient>

          {/* Dark gold for shadows */}
          <linearGradient id="darkGoldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B8860B" />
            <stop offset="100%" stopColor="#8B6914" />
          </linearGradient>

          {/* Shine effect */}
          <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base plate */}
        <ellipse
          cx="100"
          cy="70"
          rx="90"
          ry="8"
          fill="url(#darkGoldGradient)"
        />

        {/* Middle ring */}
        <ellipse
          cx="100"
          cy="55"
          rx="60"
          ry="6"
          fill="url(#goldGradient)"
          filter="url(#glow)"
        />

        {/* Top cup/holder */}
        <path
          d="M 50 40
             Q 50 55, 70 55
             L 130 55
             Q 150 55, 150 40
             Q 150 25, 130 20
             L 70 20
             Q 50 25, 50 40 Z"
          fill="url(#goldGradient)"
          filter="url(#glow)"
        />

        {/* Inner shadow of cup */}
        <ellipse
          cx="100"
          cy="35"
          rx="40"
          ry="12"
          fill="url(#darkGoldGradient)"
          opacity="0.6"
        />

        {/* Decorative ring */}
        <ellipse
          cx="100"
          cy="48"
          rx="50"
          ry="5"
          fill="url(#goldGradient)"
          stroke="#B8860B"
          strokeWidth="0.5"
        />

        {/* Shine highlight */}
        <path
          d="M 60 30 Q 100 25, 140 30"
          stroke="url(#shineGradient)"
          strokeWidth="3"
          fill="none"
          opacity="0.6"
        />

        {/* Small decorative gems */}
        <circle cx="65" cy="48" r="3" fill="#7b2cbf" opacity="0.8" />
        <circle cx="100" cy="48" r="3" fill="#00d4ff" opacity="0.8" />
        <circle cx="135" cy="48" r="3" fill="#7b2cbf" opacity="0.8" />
      </svg>
    </motion.div>
  )
}
