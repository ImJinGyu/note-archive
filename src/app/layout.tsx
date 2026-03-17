import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'Note Archive',
  description: '개인 노트 아카이브 - 모든 지식을 한 곳에',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var BG_MAP = {
                bg1: '/bg1.jpg', bg2: '/bg2.jpg', bg3: '/bg3.jpg', bg4: '/bg4.jpg', bg5: '/bg5.jpg'
              };
              var bgId = localStorage.getItem('note-archive-bg') || 'bg1';
              var bgUrl = BG_MAP[bgId] || '/bg1.jpg';
              document.body.style.backgroundImage = "url('" + bgUrl + "')";
              document.body.style.backgroundSize = 'cover';
              document.body.style.backgroundPosition = 'center center';
              document.body.style.backgroundRepeat = 'no-repeat';
              document.body.style.backgroundAttachment = 'scroll';
            } catch(e) {}
          })();
        `}} />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
