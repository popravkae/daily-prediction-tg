import { motion } from 'framer-motion'

interface ShareButtonProps {
  prediction: string
}

export const ShareButton = ({ prediction }: ShareButtonProps) => {
  const handleShare = () => {
    const telegram = window.Telegram?.WebApp

    if (telegram?.switchInlineQuery) {
      // Share via Telegram inline query
      const shareText = `${prediction}`
      telegram.switchInlineQuery(shareText)
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(prediction).then(() => {
        alert('Пророцтво скопійовано!')
      })
    }
  }

  return (
    <motion.button
      className="glass px-8 py-4 text-white font-semibold text-lg flex items-center gap-3"
      onClick={handleShare}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24917 15.0227 5.37061L8.08261 9.19071C7.54305 8.46353 6.6582 8 5.66667 8C4.19391 8 3 9.19391 3 10.6667C3 12.1394 4.19391 13.3333 5.66667 13.3333C6.6582 13.3333 7.54305 12.8698 8.08261 12.1426L15.0227 15.9627C15.0077 16.0842 15 16.2078 15 16.3333C15 17.8061 16.1939 19 17.6667 19C19.1394 19 20.3333 17.8061 20.3333 16.3333C20.3333 14.8606 19.1394 13.6667 17.6667 13.6667C16.6751 13.6667 15.7903 14.1302 15.2507 14.8574L8.31061 11.0373C8.32557 10.9158 8.33333 10.7922 8.33333 10.6667C8.33333 10.5411 8.32557 10.4175 8.31061 10.296L15.2507 6.47595C15.7903 7.20313 16.6751 7.66667 17.6667 7.66667"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Поділитися
    </motion.button>
  )
}
