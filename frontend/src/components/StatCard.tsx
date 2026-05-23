import { motion } from "framer-motion";

type Props = {
  title: string;
  value: string;
};

export default function StatCard({ title, value }: Props) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-card backdrop-blur-xl transition duration-300 hover:shadow-gold-600/15Hover dark:border-blue-500/10 dark:bg-[#0C1330]"
    >
      <h3 className="text-sm text-slate-500 dark:text-slate-400">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gold-600 dark:text-blue-400">
        {value}
      </p>
    </motion.div>
  );
}
