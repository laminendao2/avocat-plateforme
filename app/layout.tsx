import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cabinet Juridique — Gestion des dossiers",
  description: "Plateforme de gestion de dossiers juridiques",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
