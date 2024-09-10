import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Compression App",
  description: "Upload and compress images easily",
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
