import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex h-11 w-11 items-center justify-center rounded-full 
      border border-slate-200 bg-white/80 text-slate-600 shadow-sm
      dark:border-white/10 dark:bg-[#0C1330] dark:text-blue-300
      hover:scale-110 hover:border-gold-500 dark:hover:border-blue-500 hover:shadow-gold-600/15 dark:shadow-blue-600/15 transition"
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
