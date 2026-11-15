import type { Metadata } from 'next';
import './globals.css';
import { CareProvider } from '@/context/CareContext';
import Navbar from '@/components/Navbar';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';

export const metadata: Metadata = {
  title: 'CareNest AI — Intelligent Elderly Care & Medication Ecosystem',
  description:
    'Senior-centric collaborative healthcare platform with concurrency-safe medication administration, AI doctor summaries, and multi-role care circle coordination.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FBFBF9] text-navy-900 antialiased selection:bg-nest-200">
        <CareProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
          </div>
        </CareProvider>
      </body>
    </html>
  );
}
