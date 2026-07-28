import { AuthProvider } from '@/lib/auth-context';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/lib/toast-context';
import { ConfirmProvider } from '@/lib/confirm-context';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SistemGaraj',
  description:
    'Parçalarını seç, ve paylaş. SistemGaraj ile bilgisayar toplama.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased flex flex-col min-h-screen`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <div className="flex-1">{children}</div>
              <Footer />
              <CookieConsent />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
