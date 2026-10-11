import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BrightBuy | Modern Online Marketplace",
    template: "%s | BrightBuy",
  },
  description:
    "Discover high-quality electronics, apparel, home essentials, and more at BrightBuy with fast shipping and secure payments.",
  keywords: ["BrightBuy", "ecommerce", "online shopping", "electronics", "fashion", "deals"],
  authors: [{ name: "BrightBuy Team" }],
  openGraph: {
    title: "BrightBuy | Modern Online Marketplace",
    description: "Discover high-quality products with fast shipping and secure payments.",
    type: "website",
    siteName: "BrightBuy",
  },
};


import { AuthProvider } from "@/providers/AuthProvider";
import { Navbar } from "@/components/Navbar";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
