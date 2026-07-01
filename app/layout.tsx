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

<a
  href="/account"
  style={{
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: 9999,
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(0,0,0,.70)",
    border: "1px solid rgba(255,255,255,.20)",
    color: "white",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "700"
  }}
>
  My Account
</a>

        
        <a
          href="/tools"
          className="fixed right-4 top-4 z-50 rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:bg-fuchsia-400"
        >
          Grace Tools
        </a>

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
