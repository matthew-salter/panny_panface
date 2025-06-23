import type { Metadata } from "next";
import "./globals.css";
import "./ui-responsive-fixes.css"; // Import the new CSS file with overlay and circle fixes

export const metadata: Metadata = {
  title: "Panelitix Food Commodity Reporter",
  description: "Navigate commodity markets with personalised insight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
