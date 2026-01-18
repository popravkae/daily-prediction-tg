import { motion } from 'framer-motion'

interface LoaderProps {
  text?: string
}

export const Loader = ({ text = 'Консультуємось із зірками...' }: LoaderProps) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Pulsing pill loader */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #7b2cbf 0%, #00d4ff 100%)'
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Loading text */}
      <motion.p
        className="text-white/70 text-lg"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {text}
      </motion.p>
    </motion.div>
  )
}
