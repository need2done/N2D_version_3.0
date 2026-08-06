/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          orange: '#FF6B00',
          'orange-light': '#FF8C38',
          'orange-dark': '#E55A00',
          'orange-pale': '#FFF3E0',
          blue: '#1565C0',
          'blue-light': '#1976D2',
          'blue-dark': '#0D47A1',
          'blue-pale': '#E3F2FD',
          green: '#2E7D32',
          'green-light': '#4CAF50',
          'green-pale': '#E8F5E9',
        },
        'surface': {
          DEFAULT: '#FAFAFA',
          card: '#FFFFFF',
          glass: 'rgba(255,255,255,0.85)',
        },
        'text': {
          primary: '#1A1A1A',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.16)',
        'orange': '0 4px 20px rgba(255,107,0,0.3)',
        'orange-hover': '0 8px 32px rgba(255,107,0,0.45)',
        'glass': '0 8px 32px rgba(0,0,0,0.1)',
        'header': '0 2px 20px rgba(0,0,0,0.08)',
      },
      backgroundImage: {
        'gradient-orange': 'linear-gradient(135deg, #FF6B00 0%, #FF8C38 100%)',
        'gradient-blue': 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
        'gradient-hero': 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 100%)',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-orange': 'pulseOrange 2s infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,107,0,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,107,0,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}
