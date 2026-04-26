import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Takeoff",
  description: "PDF takeoff viewer for construction drawings"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
