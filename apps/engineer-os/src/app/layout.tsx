import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProgressProvider } from "@/lib/progress-store";
import { AdminGate } from "@/components/admin-gate";
import { PwaRegister } from "@/components/pwa-register";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "EngineerOS — Mission Control for Future Software Engineers",
  description:
    "The complete operating system for becoming a Google Software Engineer. WIN AUGUST. ₹20+ LPA. Admin learning OS for DSA Mantra.",
  applicationName: "EngineerOS",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EngineerOS",
  },
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icons/icon-192.png`, sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ProgressProvider>
          <AdminGate>{children}</AdminGate>
          <PwaRegister />
        </ProgressProvider>
      </body>
    </html>
  );
}
