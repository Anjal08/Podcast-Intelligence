import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Podcast Intelligence Platform v2",
  description:
    "Enterprise-grade AI-powered podcast analysis — transcription, semantic chapters, and contextual Q&A powered by Whisper and Groq LLaMA 3.3.",
  keywords: ["podcast", "AI", "transcription", "Whisper", "Groq", "analysis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
