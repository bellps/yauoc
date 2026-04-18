import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yauoc — Nosso Casamento",
  description: "Gestão de convidados para o nosso casamento.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-stone-50 text-stone-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
