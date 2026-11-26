/**
 * Observabilidad del servidor Next.js (BFF) hacia Grafana Cloud, vía la EC2 collector (Alloy):
 *  - Trazas OpenTelemetry (`@vercel/otel`): cada petición del BFF y sus llamadas a API Gateway. El encabezado
 *    `traceparent` se propaga, así que la traza continúa en los microservicios FastAPI.
 *  - Perfiles de CPU con Pyroscope.
 *
 * Solo se activa si el entorno lo define (OTEL_EXPORTER_OTLP_ENDPOINT / PYROSCOPE_SERVER_ADDRESS, que el user data
 * de la instancia apunta a la IP privada de la collector). Sin credenciales: Alloy añade el token al reenviar.
 * Un fallo aquí nunca impide arrancar la tienda.
 */

const SERVICE_NAME = 'nexus-frontend';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if ((process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '').trim()) {
    try {
      const { registerOTel } = await import('@vercel/otel');
      registerOTel({ serviceName: SERVICE_NAME });
    } catch (error) {
      console.warn('OpenTelemetry no disponible:', (error as Error).name);
    }
  }

  const pyroscopeAddress = (process.env.PYROSCOPE_SERVER_ADDRESS || '').trim();
  if (pyroscopeAddress) {
    try {
      const Pyroscope = (await import('@pyroscope/nodejs')).default;
      Pyroscope.init({
        appName: SERVICE_NAME, // mismo nombre que trazas, logs y Faro
        serverAddress: pyroscopeAddress,
        tags: { service_namespace: 'nexus', environment: process.env.NODE_ENV || 'production' },
      });
      Pyroscope.start();
    } catch (error) {
      console.warn('Pyroscope no disponible:', (error as Error).name);
    }
  }
}
