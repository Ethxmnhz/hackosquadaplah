/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          dark: '#121212',
          default: '#1E1E1E',
          light: '#2D2D2D'
        },
        primary: {
          DEFAULT: '#FF3E3E',
          dark: '#CC0000',
          light: '#FF5252'
        },
        secondary: {
          DEFAULT: '#2C3E50',
          dark: '#1A2530',
          light: '#34495E'
        },
        accent: {
          blue: '#3498DB',
          green: '#2ECC71',
          yellow: '#F1C40F'
        },
        terminal: {
          green: '#4AF626',
          bg: '#0C0C0C'
        },
        success: {
          DEFAULT: '#2ECC71',
          dark: '#27AE60',
          light: '#51DA8A'
        },
        warning: {
          DEFAULT: '#F39C12',
          dark: '#D35400',
          light: '#F1C40F'
        },
        error: {
          DEFAULT: '#E74C3C',
          dark: '#C0392B',
          light: '#FF6B6B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'glow': '0 0 10px rgba(255, 62, 62, 0.5), 0 0 20px rgba(255, 62, 62, 0.3)',
        'glow-sm': '0 0 5px rgba(255, 62, 62, 0.4), 0 0 10px rgba(255, 62, 62, 0.2)',
        'glow-blue': '0 0 10px rgba(52, 152, 219, 0.5), 0 0 20px rgba(52, 152, 219, 0.3)'
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s infinite',
        'terminal-blink': 'terminal-blink 1.2s step-end infinite'
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 62, 62, 0.4), 0 0 10px rgba(255, 62, 62, 0.2)' },
          '50%': { boxShadow: '0 0 15px rgba(255, 62, 62, 0.6), 0 0 30px rgba(255, 62, 62, 0.4)' }
        },
        'terminal-blink': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 }
        }
      },
      backgroundImage: {
        'cyber-grid': "url('/src/assets/cyber-grid.svg')",
        'circuit-pattern': "url('/src/assets/circuit-pattern.svg')"
      }
    }
  },
  plugins: []
};