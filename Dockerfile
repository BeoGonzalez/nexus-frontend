# syntax=docker/dockerfile:1.7
# Frontend Nexus (Next.js standalone) — imagen endurecida (OWASP A02/A03/A08).
#
# - Imágenes base fijadas por digest (reproducible; un tag movido no cambia la imagen).
# - Build en Debian 13 (trixie) y runtime distroless Debian 13: misma glibc: los binarios nativos (@img/sharp-linux-x64)
#   coinciden entre etapas.
# - Runtime distroless: sin shell, sin gestor de paquetes, sin npm/pnpm/corepack.
# - Usuario no root UID/GID 10001; archivos de la app propiedad de root (solo lectura para el proceso).
# - Compatible con `docker run --read-only --tmpfs /tmp`: `.next/cache` apunta a /tmp/next-cache.

# ---------------------------------------------------------------- dependencias
FROM node:22-trixie-slim@sha256:68c76cfad89921b927eae28ba21407475e29d0ce450afcdbe70c1532db042b64 AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
# .npmrc (ignore-scripts) y pnpm-workspace.yaml (builds permitidos, minimumReleaseAge) aplican aquí.
COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------- build
FROM node:22-trixie-slim@sha256:68c76cfad89921b927eae28ba21407475e29d0ce450afcdbe70c1532db042b64 AS builder
WORKDIR /app
# Variables PÚBLICAS que Next incrusta en el build (no secretos): región de Cognito para la CSP y hosts exactos
# de imágenes para el optimizador (ver src/presentation/lib/imageHosts.ts).
ARG NEXT_PUBLIC_AWS_REGION=us-east-1
ARG NEXT_PUBLIC_IMAGE_HOSTS=""
# Colector de Grafana Faro (observabilidad del navegador; URL pública, sin credenciales). Vacío = desactivado.
ARG NEXT_PUBLIC_FARO_URL=""
ARG NEXT_PUBLIC_APP_VERSION=dev
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_AWS_REGION=${NEXT_PUBLIC_AWS_REGION} \
    NEXT_PUBLIC_IMAGE_HOSTS=${NEXT_PUBLIC_IMAGE_HOSTS} \
    NEXT_PUBLIC_FARO_URL=${NEXT_PUBLIC_FARO_URL} \
    NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build \
 && rm -rf .next/standalone/.next/cache \
 && ln -s /tmp/next-cache .next/standalone/.next/cache

# ---------------------------------------------------------------- runtime
FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:f991e86a080567b6ab7c3392e36f7a0a4f9300639e526b48ee81b92d523af62e AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY docker/entrypoint.mjs docker/healthcheck.js ./

USER 10001:10001
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["/nodejs/bin/node", "healthcheck.js"]

# La imagen distroless ya usa /nodejs/bin/node como ENTRYPOINT.
CMD ["entrypoint.mjs"]
