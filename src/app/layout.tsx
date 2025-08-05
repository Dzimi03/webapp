import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import "./globals.css";
import NextAuthSessionProvider from '../../SessionProvider';
import Navbar from "./Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiveALittle - Discover Amazing Events",
  description: "Connect with friends, create unforgettable experiences, and explore events happening around you.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hide any remaining Next.js development elements
              document.addEventListener('DOMContentLoaded', function() {
                // Hide elements with Next.js branding
                const elementsToHide = document.querySelectorAll('[class*="next"], [id*="next"], [data-*="next"], [class*="create"], [id*="create"], [data-*="create"]');
                elementsToHide.forEach(el => {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                  el.style.opacity = '0';
                });
                
                // Hide any black bars or side panels
                const barsToHide = document.querySelectorAll('[class*="bar"], [id*="bar"], [data-*="bar"], [class*="sidebar"], [id*="sidebar"], [data-*="sidebar"]');
                barsToHide.forEach(el => {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                  el.style.opacity = '0';
                });
                
                // Hide any development overlays
                const overlaysToHide = document.querySelectorAll('[class*="overlay"], [id*="overlay"], [data-*="overlay"]');
                overlaysToHide.forEach(el => {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                  el.style.opacity = '0';
                });
              });
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextAuthSessionProvider>
          <Navbar />
          <main className="w-full px-8 lg:px-12 xl:px-16">{children}</main>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
