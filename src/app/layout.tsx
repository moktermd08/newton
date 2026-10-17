import type { Metadata } from "next";
// The kit first, so this app's own CSS wins over it.
import "../gg-ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newton",
  description: "Newton: one design for the public site and the admin area.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
