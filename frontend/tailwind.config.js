/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: (() => {
        // Skillarion Official Corporate Palette
        const navy = {
          50: '#f4f5fa',
          100: '#e5e7f2',
          200: '#cfd4e7',
          300: '#aeb7d5',
          400: '#8693c0',
          500: '#35387d', // Skillarion light navy
          600: '#1e2058', // Skillarion primary navy
          700: '#181a4b',
          800: '#11133b', // Skillarion dark navy
          900: '#0b0c2a',
          950: '#050618',
        };

        const gold = {
          50: '#fbf8f2',
          100: '#f5eee1',
          200: '#ead9be',
          300: '#d3ba84', // Skillarion light gold
          400: '#c5a96a',
          500: '#b09454', // Skillarion primary gold
          600: '#8f7743', // Skillarion dark gold
          700: '#735d35',
          800: '#604f32',
          900: '#4f412a',
          950: '#2b2214',
        };

        return {
          navy: { ...navy, DEFAULT: "#1e2058" },
          gold: { ...gold, DEFAULT: "#b09454" },
          
          // Map standard Tailwind colors to Skillarion palette
          // to ensure existing components inherit the new brand automatically.
          blue: navy,
          indigo: navy,
          sky: navy,
          cyan: navy,
          violet: navy,
          purple: navy,
          
          yellow: gold,
          amber: gold,
          orange: gold,

          // Keep semantic colors but tone them down slightly for professional feel
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#1e2058",

          surface: {
            light: "#f8f9fc", // Light mode background (soft cool grey)
            card: "#FFFFFF",
            darkBg: "#0b0c2a", // Dark mode background (navy 900)
            darkCard: "#11133b", // Dark mode card (navy 800)
            darkInner: "#181a4b", // Dark mode inner (navy 700)
          },
          muted: "#8693c0",
        };
      })(),

      boxShadow: {
        gold: "0 8px 30px rgba(176, 148, 84, 0.18)",
        goldHover: "0 18px 45px rgba(176, 148, 84, 0.32)",
        blue: "0 8px 30px rgba(30, 32, 88, 0.18)",
        blueHover: "0 18px 45px rgba(30, 32, 88, 0.30)",
        card: "0 4px 24px rgba(30, 32, 88, 0.06)",
        cardDark: "0 4px 24px rgba(0,0,0,0.5)",
        glow: "0 0 40px rgba(176, 148, 84, 0.30)",
      },

      fontFamily: {
        sans: ["Inter", "Segoe UI", "sans-serif"],
        display: ["'Playfair Display'", "serif"],
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
