/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#60A5FA',
        },
        secondary: {
          DEFAULT: '#1E40AF',
          dark: '#1E3A8A',
        },
        accent: {
          DEFAULT: '#38BDF8',
          light: '#7DD3FC',
        },
        navy: {
          900: '#0F172A',
          950: '#0B0F19',
          800: '#172554',
          700: '#1E3A8A',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.10)',
          borderHover: 'rgba(56, 189, 248, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-primary': '0 0 25px rgba(37, 99, 235, 0.4)',
        'glow-accent': '0 0 25px rgba(56, 189, 248, 0.4)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.15)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.15)' },
          '70%': { transform: 'scale(1)' },
        },
        glow: {
          '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.4))' },
          '100%': { opacity: '1', filter: 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
