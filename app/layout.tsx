import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionTimeoutProvider } from "@/components/session-timeout-provider";
import { RegisterServiceWorker } from "./register-sw";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

const poppins = Poppins({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "JKKN | COE",
  
  icons: {
    icon: '/jkkn_1.svg',

  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Performance: preconnect/dns-prefetch for auth providers */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="preconnect" href="https://accounts.google.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://oauth2.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://oauth2.googleapis.com" />
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} ${poppins.variable} font-inter antialiased`}>
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
