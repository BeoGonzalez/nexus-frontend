import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/presentation/providers/QueryProvider";
import { THEME_BOOT_SCRIPT } from "@/presentation/lib/theme";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Display face: variable width axis lets headlines run expanded (≈118%) and prices at normal width.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nexus Digital Store",
    template: "%s | Nexus Digital Store",
  },
  description: "Videojuegos para PS5, Xbox, Switch y PC con precios en pesos chilenos y stock en tiempo real.",
  openGraph: {
    title: "Nexus Digital Store",
    description: "Videojuegos para PS5, Xbox, Switch y PC con precios en pesos chilenos y stock en tiempo real.",
    type: "website",
    locale: "es_CL",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1014" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce por petición generado en src/proxy.ts (CSP estricta, OWASP A02/A05).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${archivo.variable}`}
    >
      <head>
        {/* Script estático y constante (sin datos de usuario); autorizado por nonce en la CSP. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
