import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionTimeoutProvider } from "@/components/session-timeout-provider";
import { RegisterServiceWorker } from "./register-sw";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "JKKN COE",
  description: "Controller of Examination - A child application integrated with MyJKKN authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} font-inter antialiased`}>
        <RegisterServiceWorker />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider
            autoValidate={true}
            autoRefresh={true}
            refreshInterval={10 * 60 * 1000} // 10 minutes
            sessionTimeout={15} // 15 minutes
            sessionWarning={2} // 2 minutes warning
          >
            <SessionTimeoutProvider
              timeoutDuration={15} // 15 minutes
              warningDuration={2} // 2 minutes warning
            >
              {children}
            </SessionTimeoutProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
