import { motion } from 'framer-motion'

interface PredictionBubbleProps {
  prediction: string
  onClose: () => void
}

export const PredictionBubble = ({ prediction, onClose }: PredictionBubbleProps) => {
  const handleClose = () => {
    try {
      // Use Telegram WebApp close
      window.Telegram?.WebApp?.close()
    } catch {
      // Fallback - just call the onClose callback
      onClose()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={handleClose}
      />

      {/* Bubble container */}
      <motion.div
        className="relative max-w-sm w-full"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.1,
        }}
      >
        {/* Main bubble */}
        <div
          className="relative bg-gradient-to-br from-purple-900/90 to-indigo-900/90
                     backdrop-blur-md rounded-3xl p-6 border border-white/20
                     shadow-2xl shadow-purple-500/30"
        >
          {/* Decorative glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-400
                          rounded-3xl blur-lg opacity-30 -z-10" />

          {/* Stars decoration */}
          <div className="absolute top-3 left-4 text-yellow-400/60 text-xl">✨</div>
          <div className="absolute top-3 right-4 text-cyan-400/60 text-xl">✨</div>

          {/* Header */}
          <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-bold text-white/90">
              🔮 Твоє пророцтво
            </h3>
          </motion.div>

          {/* Prediction text */}
          <motion.p
            className="text-white text-center text-lg leading-relaxed mb-6 px-2"
            style={{
              textShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {prediction}
          </motion.p>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-4" />

          {/* Close button */}
          <motion.button
            onClick={handleClose}
            className="w-full py-3 px-6 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-purple-600 to-cyan-600
                       hover:from-purple-500 hover:to-cyan-500
                       active:scale-95 transition-all duration-200
                       shadow-lg shadow-purple-500/30"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.5,
              type: 'spring',
              stiffness: 300,
            }}
          >
            Закрити
          </motion.button>
        </div>

        {/* Bubble pointer/tail */}
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6
                     bg-gradient-to-br from-purple-900/90 to-indigo-900/90
                     rotate-45 border-r border-b border-white/20"
        />
      </motion.div>
    </motion.div>
  )
}
