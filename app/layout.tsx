import type { Metadata } from "next";
import { Special_Elite, Kalam } from "next/font/google";
import "./globals.css";

const typewriter = Special_Elite({
  variable: "--font-typewriter",
  weight: "400",
  subsets: ["latin"],
});

const handwriting = Kalam({
  variable: "--font-handwriting",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledger of Shame",
  description: "A corkboard for tracking who owes who.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${typewriter.variable} ${handwriting.variable}`}>
      <body>{children}</body>
    </html>
  );
}
