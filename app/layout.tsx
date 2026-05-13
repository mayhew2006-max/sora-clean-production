import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Grace",
  description: "Technology that feels more human.",
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
