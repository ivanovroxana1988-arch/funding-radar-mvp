import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Funding Radar MVP",
  description: "Radar pentru apeluri de finantare europeana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
