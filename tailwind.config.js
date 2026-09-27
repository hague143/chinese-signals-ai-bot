/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07090e',
          900: '#0b0f19',
          850: '#0f1422',
          800: '#141b2d',
          750: '#192238',
          700: '#1f2942',
          600: '#2d3b5e',
          500: '#43557e',
        },
        brand: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          purple: '#7928ca',
          gold: '#f59e0b',
        },
        call: {
          DEFAULT: '#00e676',
          glow: 'rgba(0, 230, 118, 0.4)',
          dark: '#00b359',
          light: '#69f0ae',
          bg: 'rgba(0, 230, 118, 0.1)',
          border: 'rgba(0, 230, 118, 0.3)',
        },
        put: {
          DEFAULT: '#ff3366',
          glow: 'rgba(255, 51, 102, 0.4)',
          dark: '#cc1144',
          light: '#ff6688',
          bg: 'rgba(255, 51, 102, 0.1)',
          border: 'rgba(255, 51, 102, 0.3)',
        },
        wait: {
          DEFAULT: '#ffb300',
          glow: 'rgba(255, 179, 0, 0.4)',
          dark: '#cc8f00',
          light: '#ffd54f',
          bg: 'rgba(255, 179, 0, 0.1)',
          border: 'rgba(255, 179, 0, 0.3)',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-call': '0 0 25px rgba(0, 230, 118, 0.35)',
        'glow-put': '0 0 25px rgba(255, 51, 102, 0.35)',
        'glow-wait': '0 0 25px rgba(255, 179, 0, 0.35)',
        'glow-cyan': '0 0 20px rgba(0, 242, 254, 0.25)',
        'card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
}
