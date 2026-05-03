import "./globals.css";

export const metadata = {
  title: "Sora",
  description: "Someone to talk to without judgment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
