import "./globals.css";

export const metadata = {
  title: "Grace",
  description: "Someone who listens when no one else is there.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
