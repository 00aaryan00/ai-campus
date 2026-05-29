/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: (() => {
        // Deep Plum purple scale — used to override common Tailwind color
        // families so any existing blue/indigo/gold/etc. utility class in the
        // codebase renders as purple without editing every component.
        const plum = {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        };
        return {
          // Primary palette (formerly navy)
          navy: { ...plum, DEFAULT: "#7e22ce" },
          // Accent palette (formerly gold) — lighter lavender steps
          gold: {
            50: "#faf5ff",
            100: "#f3e8ff",
            200: "#e9d5ff",
            300: "#d8b4fe",
            400: "#c084fc",
            500: "#b794f4",
            600: "#a855f7",
            700: "#9333ea",
            800: "#7e22ce",
            900: "#6b21a8",
            DEFAULT: "#a855f7",
          },
          // Override default Tailwind families so legacy utility classes
          // resolve to purple shades automatically.
          blue: plum,
          indigo: plum,
          sky: plum,
          cyan: plum,
          violet: plum,
          purple: plum,
          fuchsia: plum,
          amber: plum,
          yellow: plum,
          orange: plum,
          teal: plum,
          emerald: plum,
          rose: plum,
          pink: plum,
          accent: {
            blue: "#7c3aed",
            teal: "#a855f7",
            orange: "#c026d3",
            purple: "#9333ea",
            pink: "#d946ef",
            emerald: "#a855f7",
            rose: "#c026d3",
            sky: "#8b5cf6",
            cyan: "#a78bfa",
          },
          surface: {
            light: "#faf5ff",
            card: "#FFFFFF",
            darkBg: "#1a0a2e",
            darkCard: "#241038",
            darkInner: "#2e1747",
          },
          muted: "#9b8bb4",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#9333EA",
        };
      })(),

      boxShadow: {
        gold: "0 8px 30px rgba(147, 51, 234, 0.18)",
        goldHover: "0 18px 45px rgba(147, 51, 234, 0.32)",
        blue: "0 8px 30px rgba(124, 58, 237, 0.18)",
        blueHover: "0 18px 45px rgba(124, 58, 237, 0.30)",
        card: "0 4px 24px rgba(88, 28, 135, 0.10)",
        cardDark: "0 4px 24px rgba(0,0,0,0.5)",
        glow: "0 0 40px rgba(147, 51, 234, 0.18)",
      },

      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
        display: ["Outfit", "Inter", "sans-serif"],
      },

      animation: {
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "float-medium": "floatMedium 4s ease-in-out infinite",
        "shimmer": "shimmer 2.5s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "bubble": "bubbleFloat 8s ease-in-out infinite",
      },

      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        floatMedium: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(147, 51, 234, 0.20)" },
          "50%": { boxShadow: "0 0 40px rgba(147, 51, 234, 0.40)" },
        },
        bubbleFloat: {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.5" },
          "50%": { transform: "translateY(-30px) scale(1.1)", opacity: "0.8" },
        },
      },
    },
  },

  plugins: [
    require('@tailwindcss/typography'),
  ],
};
