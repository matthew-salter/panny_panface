import type { Metadata } from "next";
import "./globals.css";
import "./ui-responsive-fixes.css"; // Import the new CSS file with overlay and circle fixes
import "./test-environment.css"; // Import the test environment banner CSS
import TestEnvironmentBanner from "./components/TestEnvironmentBanner";

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
      <body className={`antialiased`}>
        <TestEnvironmentBanner />
        {children}
      </body>
    </html>
  );
}
