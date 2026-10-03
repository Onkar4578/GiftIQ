import type { Metadata } from "next";
import Header from "@/components/Header";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "GiftIQ: corporate gift quotes in minutes",
  description: "Turn a plain-English gifting brief into a priced, delivery-dated quote.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Public+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
