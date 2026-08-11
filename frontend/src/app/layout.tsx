import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/ui/command-palette";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "Sanguis — Blood Donor Matching & Emergency Response",
  description: "Real-time blood donor matching connecting verified hospitals with eligible donors, powered by AI urgency scoring and geo-based dispatch.",
  icons: {
    icon: [
      { url: "/logo.jpg" },
      { url: "/favicon.ico" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="hackathon-theme">
          <AuthProvider>
            {children}
            <CommandPalette />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
