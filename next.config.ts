import type { NextConfig } from "next";
import { optimizableHosts } from "./src/presentation/lib/imageHosts";

/**
 * OWASP A02 — Security Misconfiguration.
 * Cabeceras estáticas aplicadas a TODAS las respuestas. La Content-Security-Policy se emite en
 * `src/proxy.ts` porque necesita un nonce distinto por petición.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  images: {
    // Solo buckets S3 (no cualquier host *.amazonaws.com) y Unsplash pasan por el optimizador.
    // Los demás hosts se renderizan `unoptimized` (ver src/presentation/lib/cover.ts).
    // Hosts EXACTOS (sin comodines): ver src/presentation/lib/imageHosts.ts. Un patrón como
    // *.s3.amazonaws.com dejaba al optimizador descargar imágenes de cualquier bucket de AWS.
    remotePatterns: optimizableHosts().map((hostname) => ({ protocol: "https" as const, hostname })),
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Las respuestas del BFF nunca deben cachearse en proxies intermedios ni en el navegador.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
