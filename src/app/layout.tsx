import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AgencyDash',
  description: 'Manage and explore agencies and their contact information with ease.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <SignedOut>
              <main className='flex h-screen justify-center items-center'>
                <SignIn routing='hash'/>
              </main>
            </SignedOut>
            <SignedIn>
              <header className="sticky top-0 z-50 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-8">
                  <div className="flex justify-between items-center h-16">
                    <nav className="flex items-center gap-8">
                      <Link 
                        href="/dashboard/agencies" 
                        className="text-gray-700 hover:text-gray-900 font-bold transition"
                      >
                        Agencies
                      </Link>
                      <Link 
                        href="/dashboard/contacts" 
                        className="text-gray-700 hover:text-gray-900 font-bold transition"
                      >
                        Contacts
                      </Link>
                    </nav>
                    <UserButton />
                  </div>
                </div>
              </header>
              <main>
                {children}
              </main>
            </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}