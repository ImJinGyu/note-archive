'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
      aria-label="테마 전환"
      className="fixed bottom-6 right-20 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
      style={{
        background: theme === 'dark' ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.9)',
        border: theme === 'dark' ? '1px solid rgba(148,163,184,0.3)' : '1px solid rgba(186,230,253,0.8)',
        backdropFilter: 'blur(12px)',
        boxShadow: theme === 'dark'
          ? '0 4px 20px rgba(0,0,0,0.4)'
          : '0 4px 20px rgba(14,165,233,0.2)',
      }}
    >
      <span className="text-lg leading-none select-none">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
