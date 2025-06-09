// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

// fonts ────────────────────────────────────────────────
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadata ─────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Cloudinary SAAS App",
  description: "Powered by Next.js, Prisma & Clerk",
};

// IMPORTANT: load the key from env.  It MUST start with NEXT_PUBLIC_
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard against missing key in non-prod or CI preview:
  if (!publishableKey) {
    console.error(
      "⛔️  Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY – check Vercel env vars"
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
