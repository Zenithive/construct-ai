import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConstructAI',
  description: 'AI-powered construction compliance assistant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
