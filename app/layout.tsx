import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { PinGate } from '@/components/PinGate';
import { Navbar } from '@/components/Navbar';

const noto = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ละแมฟาร์ม',
  description: 'ระบบจัดการฟาร์มวัวไทยบราห์มัน บ้านดวด ละแม ชุมพร',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${noto.className} bg-gray-50 text-gray-900`}>
        <AuthProvider>
          <PinGate>
            <Navbar />
            {/* Main content: offset for bottom nav on mobile, sidebar on desktop */}
            <main className="pb-20 md:pb-0 md:ml-52 min-h-screen">
              <div className="max-w-4xl mx-auto px-4 py-6">
                {children}
              </div>
            </main>
          </PinGate>
        </AuthProvider>
      </body>
    </html>
  );
}
