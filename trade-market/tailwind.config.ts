import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))",
        "surface-overlay": "hsl(var(--surface-overlay))",
        foreground: "hsl(var(--foreground))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        brand: "hsl(var(--brand))",
        "brand-muted": "hsl(var(--brand-muted))",
        gain: "hsl(var(--gain))",
        "gain-muted": "hsl(var(--gain-muted))",
        loss: "hsl(var(--loss))",
        "loss-muted": "hsl(var(--loss-muted))",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        "card-hover": "0 12px 32px -20px hsl(var(--brand) / 0.55)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "ticker-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "flash-up": {
          "0%": { transform: "translateY(0)", backgroundColor: "hsl(var(--gain) / 0.32)" },
          "100%": { transform: "translateY(-1px)", backgroundColor: "transparent" },
        },
        "flash-down": {
          "0%": { transform: "translateY(0)", backgroundColor: "hsl(var(--loss) / 0.32)" },
          "100%": { transform: "translateY(1px)", backgroundColor: "transparent" },
        },
      },
      animation: {
        "ticker-left": "ticker-left 30s linear infinite",
        "flash-up": "flash-up 400ms ease-out",
        "flash-down": "flash-down 400ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
