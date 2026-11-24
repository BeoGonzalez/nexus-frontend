import { createProxyRoute } from '@/infrastructure/bff/serviceProxy';

// OWASP A01: catálogo de solo lectura desde el navegador. Las escrituras de administración pasan
// exclusivamente por Server Actions con requireAdmin() (src/application/actions/adminGames.ts).
export const { GET } = createProxyRoute('catalog', {
  fixed: ['api', 'v1', 'catalog'],
  methods: ['GET'],
});
