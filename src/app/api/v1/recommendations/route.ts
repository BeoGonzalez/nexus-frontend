import { createProxyRoute } from '@/infrastructure/bff/serviceProxy';

// OWASP A01/A05/A10: proxy con lista blanca de servicio, validación de segmentos y errores genéricos.
export const { GET } = createProxyRoute('recommendations', {
  fixed: ['api', 'v1', 'recommendations', 'trending'],
  methods: ['GET'],
});
