import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KODAND - 360° Website Audit",
  description:
    "KODAND: Free, anonymous, serverless 360-degree website audit. Scan grammar, security, and digital health. Generate a downloadable PDF report — no sign-up required.",
  keywords: [
    "KODAND",
    "website audit",
    "grammar checker",
    "security scan",
    "digital health score",
    "PDF report",
    "anonymous",
  ],
  authors: [{ name: "KODAND" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "KODAND - 360° Website Audit",
    description:
      "Free, anonymous, serverless website audit. Grammar, security, digital health score, PDF report.",
    url: "https://chat.z.ai",
    siteName: "KODAND",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KODAND - 360° Website Audit",
    description:
      "Free, anonymous, serverless website audit. Grammar, security, digital health score, PDF report.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
