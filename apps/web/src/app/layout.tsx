import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '../components/Toast';
import { AuthProvider } from '../context/AuthContext';
import { CollaborationProvider } from '../context/CollaborationContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DevFlow | Real-Time Engineering Collaboration Workspace',
  description: 'Manage projects, Kanban tasks, real-time discussions, GitHub syncing, and AI coding workflows in one unified engineering dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white">
        <ToastProvider>
          <AuthProvider>
            <CollaborationProvider>{children}</CollaborationProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
