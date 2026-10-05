import type { Metadata } from "next";
import { APP_NAME } from "@resume-judge/types";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "AI-powered resume analysis with explainable, evidence-based scoring.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
