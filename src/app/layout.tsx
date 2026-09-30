import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BursaBukti — Asisten Verifikasi Klaim Pasar Modal Indonesia',
  description: 'Verifikasi klaim emiten dan saham di pasar modal Indonesia dengan bukti data faktual Sectors API.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
} 
