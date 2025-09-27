import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Money Trust Microfinance",
  description: "Microfinance management system built with Next.js",
  keywords: ["microfinance", "financial", "management", "loans", "clients"],
  authors: [{ name: "Money Trust Microfinance" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="scroll-smooth"
      // suppressHydrationWarning={true}
    >
      <body
        className={`${figtree.className} antialiased font-figtree bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
        suppressHydrationWarning={true}
      >
        <Providers>
          {children}
          <Toaster position="top-center" reverseOrder={false} gutter={8} />
        </Providers>
      </body>
    </html>
  );
}
