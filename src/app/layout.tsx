import type { Metadata } from 'next';
import { Orbitron } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import localFont from "next/font/local";

const generalSans = localFont({
  src: [
    {
      path: "/public/fonts/GeneralSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "/public/fonts/GeneralSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "/public/fonts/GeneralSans-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

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
      <body className={cn("min-h-screen bg-background antialiased", generalSans.variable)}>
        {children}
      </body>
    </html>
  );
}
