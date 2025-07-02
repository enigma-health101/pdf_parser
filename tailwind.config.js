// File: tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d3748', // Custom shade between gray-700 and gray-800
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'blue-glow': '0 0 15px 1px rgba(59, 130, 246, 0.4)',
      },
    },
  },
  plugins: [],
}