import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareNest AI — Intelligent Elderly Care & Medication Ecosystem',
  description: 'Senior-centric collaborative healthcare and medication management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FBFBF9] text-navy-900 antialiased selection:bg-nest-200">
        {children}
      </body>
    </html>
  );
}
