import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SensorHub - IoT Sensor Monitor",
  description: "Real-time IoT sensor monitoring dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-app">{children}</body>
    </html>
  );
}