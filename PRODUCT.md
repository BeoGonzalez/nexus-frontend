# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Compradores y coleccionistas de videojuegos y ediciones físicas con envíos internacionales, que demandan títulos para múltiples plataformas (PC, PS5, Xbox Series X, Nintendo Switch) con información de inventario precisa y seguimiento seguro.

## Product Purpose
Ofrecer una plataforma de e-commerce inmersiva y de vanguardia para la adquisición y gestión de videojuegos, combinando compras fluidas, asistencia interactiva guiada por IA y administración segura del catálogo en tiempo real.

## Positioning
Tienda premium de videojuegos con lenguaje de vidrio translúcido (glassmorphism inspirado en los materiales actuales de Apple, sin usar su marca): capas con profundidad, mucho espacio y tipografía impecable, que se ve igual de bien en modo claro y oscuro. Las portadas y los objetos 3D son los protagonistas; el vidrio es el material de la interfaz que flota sobre ellos (navbar, cards, modales, carrito lateral, controles flotantes), no una decoración aplicada a todo. Se distingue de los e-commerce genéricos por la calidad del material y del movimiento, no por efectos llamativos. Mantiene autenticación federada en AWS Cognito, asistente 3D en WebGL y datos reales de Amazon Aurora PostgreSQL.

## Operating Context
- Navegación pública de catálogo, filtrado dinámico por plataforma y género, gestión de carrito y checkout en moneda local (CLP).
- Asistencia interactiva de compras mediante ChatBotOrb 3D (`@react-three/fiber`).
- Consola administrativa protegida por roles (`AdminGuard`) para la gestión integral de stock, precios y portadas en Aurora PostgreSQL.
- Infraestructura basada en microservicios contenerizados y servicios AWS en la nube.

## Capabilities and Constraints
- **Stack Técnico**: Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript 5.
- **Autenticación**: AWS Cognito con Amplify v6 (flujo OAuth2 Hosted UI) y control de acceso basado en roles (RBAC).
- **Backend & Almacenamiento**: FastAPI en Docker Compose, base de datos relacional Amazon Aurora PostgreSQL y assets en Amazon S3.
- **Transparencia de Datos**: Cero datos hardcodeados; el catálogo se alimenta de manera estricta de la base de datos conectada.

## Brand Commitments
- **Nombre**: Nexus Digital Store (antes Gamma Terminal / Gamma Game Store).
- **Material**: vidrio translúcido por capas. Claro: blanco translúcido, borde fino brillante, sombras suaves y difusas sobre gradientes pastel sutiles. Oscuro: grafito translúcido, highlight de borde tenue, sobre gradientes profundos. El vidrio se reserva para superficies que flotan sobre contenido.
- **Paleta**: neutros fríos como base; los acentos de marca cian `#48c8d8` y ámbar `#FF9900` se conservan, reinterpretados de forma refinada (tonos ajustados por tema para cumplir contraste). Sin neón, sin resplandores (*glow*), sin estética de terminal.
- **Temas**: modo claro y oscuro de primera clase. Por defecto sigue `prefers-color-scheme`; toggle accesible que recuerda la elección y sin parpadeo de tema al cargar.
- **Tipografía**: Archivo con eje de ancho (ensanchada en titulares) + Geist para interfaz y cuerpo + Geist Mono para códigos, vía `next/font`. Sin Inter ni SF Pro.
- **Movimiento**: fluido y con intención; curvas tipo spring, 150–400 ms en UI, solo `transform` y `opacity`. Una entrada de hero y uno o dos momentos memorables por página.
- **Sin marca de terceros**: ningún logo, nombre ni asset de Apple; solo inspiración.

## Evidence on Hand
- Frontend Next.js completamente funcional en `src/app`.
- Componente de autenticación corporativa en [`src/components/auth/CognitoLoginButton.tsx`](src/components/auth/CognitoLoginButton.tsx).
- Panel de control y CRUD de inventario en [`src/components/admin/VideoGamesCrud.tsx`](src/components/admin/VideoGamesCrud.tsx).
- Suite automatizada de pruebas unitarias y de integración en Vitest (10 tests en verde).

## Product Principles
1. **Verdad de Datos en Producción**: Toda la información de catálogo, stock y valuaciones proviene exclusivamente de la base de datos de Amazon Aurora sin inventar ni simular registros.
2. **Las portadas mandan, la interfaz acompaña**: el color lo ponen los juegos; el vidrio, la tipografía y el movimiento existen para dar profundidad, orden y continuidad entre pantallas, nunca para lucirse. Cada animación explica un cambio (qué se abrió, qué se añadió, adónde fue) o no está.
3. **Seguridad y Control RBAC Riguroso**: Las operaciones de modificación y administración exigen verificación de claims y grupos en AWS Cognito.
4. **Accesibilidad y Rendimiento**: Estándar WCAG 2.1 AA con foco visible, atributos ARIA semánticos y optimización con Turbopack.

## Accessibility & Inclusion
- WCAG 2.1 AA en ambos temas: contraste mínimo 4.5:1 para texto (3:1 texto grande y componentes), medido sobre el fondo real detrás del vidrio, no sobre un color plano.
- Fallback opaco con `prefers-reduced-transparency` y para navegadores sin `backdrop-filter`.
- `prefers-reduced-motion` respetado en todo: con movimiento reducido solo quedan fundidos.
- Foco visible en ambos temas, navegación completa con teclado y ARIA correctos (diálogos, drawer, menús).
- Anuncios para lectores de pantalla mediante `aria-live` y `role="alert"` (carrito, errores, estado de pago).
- Zoom del navegador permitido; mobile first, sin scroll horizontal a 375 px, objetivos táctiles de 44×44 px.
