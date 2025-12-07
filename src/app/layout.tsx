import type { Metadata } from 'next';
import { Orbitron } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';


const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'DeepFunding AI',
  description: 'AI-powered knowledge assistant for DeepFunding.',
  icons: {
    icon: '/logo.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', orbitron.variable)}>
        {children}
      </body>
    </html>
  );
}
