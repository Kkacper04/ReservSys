import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ReservSys — Workplace Desk Reservations",
  description: "Architectural workspace booking and seat management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F7F6F2] text-[#161615] font-sans">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#FFFFFF",
              color: "#161615",
              border: "1px solid #E4E2DC",
              borderRadius: "0.625rem",
              fontSize: "0.875rem",
              boxShadow: "0 4px 16px rgba(22, 22, 21, 0.08)",
            },
            success: {
              iconTheme: {
                primary: "#1B4D3E",
                secondary: "#FFFFFF",
              },
            },
            error: {
              iconTheme: {
                primary: "#9E2A2B",
                secondary: "#FFFFFF",
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
