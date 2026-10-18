/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "#070c18",
          card: "#0d1527",
          border: "#1e293b",
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e"
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace', 'ui-monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.4)',
        'glow-violet': '0 0 15px -3px rgba(139, 92, 246, 0.4)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.4)',
      }
    },
  },
  plugins: [],
}
