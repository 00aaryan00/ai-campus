import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Pencil,
  NotebookPen,
  Calculator,
  BrainCircuit,
} from "lucide-react";

const icons = [
  { Icon: BookOpen, top: "12%", left: "8%", delay: 0 },
  { Icon: GraduationCap, top: "18%", left: "82%", delay: 0.7 },
  { Icon: Pencil, top: "42%", left: "12%", delay: 1.2 },
  { Icon: NotebookPen, top: "65%", left: "85%", delay: 1.8 },
  { Icon: Calculator, top: "78%", left: "18%", delay: 2.3 },
  { Icon: BrainCircuit, top: "55%", left: "55%", delay: 2.8 },
];

export default function StudyBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {icons.map(({ Icon, top, left, delay }, index) => (
        <motion.div
          key={index}
          className="absolute text-cyan-300/35"
          style={{ top, left }}
          animate={{
            y: [0, -35, 0],
            rotate: [0, 10, -10, 0],
            scale: [1, 1.12, 1],
            opacity: [0.25, 0.55, 0.25],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
        >
          <Icon size={70} strokeWidth={1.4} />
        </motion.div>
      ))}
    </div>
  );
}