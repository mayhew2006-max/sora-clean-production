import "./globals.css";
import Script from "next/script";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata = {
  title: "Grace",
  description:
    "Grace helps you analyze photos, check Marketplace deals, search the web, create plans, save reports, and download PDFs.",
  manifest: "/manifest.webmanifest",
  applicationName: "Grace",
  appleWebApp: {
    capable: true,
    title: "Grace",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#f3a683",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Q4J04MDK1F"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Q4J04MDK1F');
          `}
        </Script>
      </body>
    </html>
  );
}
