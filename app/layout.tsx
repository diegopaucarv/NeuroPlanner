import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'] })
const geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NeuroPlanner',
  description: 'Plan your life, achieve your goals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress HMR chunk loading errors in iframe environments
                const originalError = window.onerror;
                window.onerror = function(msg, url, line, col, error) {
                  if (msg && (msg.includes('chunk') || msg.includes('loading'))) {
                    return true;
                  }
                  if (originalError) {
                    return originalError(msg, url, line, col, error);
                  }
                };

                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && (event.reason.message?.includes('chunk') || event.reason.toString?.().includes('chunk'))) {
                    event.preventDefault();
                  }
                });

                window.addEventListener('error', function(event) {
                  if (event.message?.includes('chunk') || event.message?.includes('loading')) {
                    event.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
