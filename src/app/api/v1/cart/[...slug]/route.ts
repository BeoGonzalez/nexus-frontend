import { createProxyRoute } from '@/infrastructure/bff/serviceProxy';

// OWASP A01/A05/A10: proxy con lista blanca de servicio, validación de segmentos y errores genéricos.
export const { GET, POST, PUT } = createProxyRoute('cart', {
  fixed: ['api', 'v1', 'cart'],
  methods: ['GET', 'POST', 'PUT'],
});
