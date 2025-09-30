import { lotties } from "@/constants/assets";
import LottieDisplay from "./lottie-display";
import { motion } from "framer-motion";

const LoadingOverlay = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-[9999]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
          delay: 0.1,
        }}
        className="flex flex-col items-center gap-4 min-w-[300px]"
      >
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: 0.2,
          }}
          className="text-foreground text-lg font-medium text-center"
        >
          Hi, Welcome to TCB Smart Links
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
            delay: 0.3,
          }}
        >
          <LottieDisplay
            animationData={lotties.loadingSpinnerYellow}
            height={100}
            width={100}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingOverlay;
