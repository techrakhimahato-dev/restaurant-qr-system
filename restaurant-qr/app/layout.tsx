import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Himalayan Restaurant | Order at your table",
  description: "Explore the Himalayan Restaurant menu and order fresh dishes directly from your table.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
