import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import { GlobalDocumentPreviewModal } from "@/components/modals/DocumentPreviewModal";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "BharatEdge Enterprise OS — BE SAAS",
  description: "Next-generation enterprise operations portal for BharatEdge Services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FCFBF8] text-slate-900 selection:bg-[#F0944D]/25 selection:text-[#C9681A]">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <GlobalDocumentPreviewModal />
        </AuthProvider>
      </body>
    </html>
  );
}
