import { VideoGamesCrud } from "@/components/admin/VideoGamesCrud";
import { getSessionUser, isAdminUser } from "@/infrastructure/bff/session";

/**
 * OWASP A01: autorización en el servidor también en la página (no solo en el layout ni en
 * src/proxy.ts). Layout y página se renderizan en paralelo: sin esta comprobación el payload RSC de
 * la página podría llegar a un usuario sin rol admin.
 */
export default async function AdminDashboardPage() {
  if (!isAdminUser(await getSessionUser())) return null;
  return <VideoGamesCrud />;
}
