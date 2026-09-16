import { motion } from 'framer-motion'
import Logo from './Logo'

export default function LoadingScreen() {
  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="loading-grain" />
      <motion.div
        className="loading-logo"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Logo className="loading-logo-img" />
      </motion.div>
    </motion.div>
  )
}
