export interface Platform {
  id: string;
  name: string;
}

export interface Genre {
  id: string;
  name: string;
}

export interface VideoGame {
  id: string;
  title: string;
  description?: string;
  price_clp: number;
  stock: number;
  platform?: Platform;
  genres?: Genre[];
  image_url?: string;
  image?: string;
  created_at?: string;
  category?: string;
}

export interface OrderItem {
  video_game_id: string;
  quantity: number;
}

export interface OrderPayload {
  items: OrderItem[];
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  card_last_4: string;
  card_brand: string;
  is_default: boolean;
}

export interface CreatePaymentMethodPayload {
  card_number: string;
  card_brand: string;
  is_default: boolean;
}

export interface ApiErrorDetail {
  loc?: (string | number)[];
  msg: string;
  type?: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface Order {
  id: string;
  userId: string;
  items: { videoGameId: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  paymentMethodId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | string;
  is_admin?: boolean;
  is_active?: boolean;
  is_confirmed?: boolean;
  image?: string | null;
}

// ==============================================================================
// Modelos del Microservicio de Autenticación Nexus (OAS 3.1 / AWS Cognito)
// ==============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  // Alias de compatibilidad hacia adelante
  token?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | string;
  is_admin: boolean;
  is_active: boolean;
  is_confirmed: boolean;
  image?: string | null;
}

export interface ConfirmSignUpRequest {
  email: string;
  confirmation_code: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  confirmation_code: string;
  new_password: string;
}

export interface AuthInfoResponse {
  auth_provider: string;
  cognito_region: string;
  cognito_user_pool_id: string;
  cognito_app_client_id: string;
  has_client_secret: boolean;
}

export interface AuthHealthResponse {
  status: string;
  service?: string;
  cognito_configured?: boolean;
  region?: string;
  [key: string]: unknown;
}

export interface AuthGenericMessageResponse {
  status: string;
  message: string;
  [key: string]: unknown;
}

// ==============================================================================
// Modelos del Microservicio de Catálogo e Inventario Nexus (OAS 3.1 / Puerto 8002)
// ==============================================================================

export interface PlatformResponse {
  id: string;
  name: string;
}

export interface GenreResponse {
  id: string;
  name: string;
}

export interface ProductResponse {
  id: string;
  title: string;
  description: string;
  price_clp: number;
  stock: number;
  image_url?: string | null;
  platform?: PlatformResponse | null;
  genres: GenreResponse[];
}

export interface CreateProductRequest {
  title: string;
  description: string;
  price_clp: number;
  stock: number;
  image_url?: string | null;
  platform_name?: string | null;
  genre_names?: string[];
}

export interface UpdateStockRequest {
  delta: number;
}

export interface UpdateStockResponse {
  product_id?: string;
  updated?: boolean;
  [key: string]: unknown;
}

export interface CatalogHealthResponse {
  status: string;
  service: string;
  [key: string]: unknown;
}

// ==============================================================================
// Modelos del Microservicio de Carrito de Compras Nexus (OAS 3.1 / Redis / Puerto 8003)
// ==============================================================================

export interface CartItemResponse {
  product_id: string;
  title: string;
  unit_price_clp: number;
  quantity: number;
  subtotal_clp: number;
  image_url?: string | null;
}

export interface CartResponse {
  user_id: string;
  items: CartItemResponse[];
  total_amount_clp: number;
  total_items_count: number;
}

export interface AddToCartRequest {
  product_id: string;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartHealthResponse {
  status: string;
  service: string;
  [key: string]: unknown;
}

// ==============================================================================
// Modelos del Microservicio de Órdenes y Pagos Nexus (OAS 3.1 / Puerto 8004)
// ==============================================================================

export type OrderStatus =
  | 'PENDING'
  | 'STOCK_CONFIRMED'
  | 'PAID'
  | 'CANCELLED'
  | 'DELIVERED';

export interface OrderItemRequest {
  product_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItemRequest[];
  idempotency_key?: string | null;
}

export interface OrderItemResponse {
  product_id: string;
  quantity: number;
  unit_price_clp: number;
  subtotal_clp: number;
  product_title?: string | null;
}

export interface OrderResponse {
  id: string;
  user_id: string;
  user_email?: string | null;
  status: OrderStatus;
  items: OrderItemResponse[];
  total_amount_clp: number;
  created_at: string;
}

export interface ProcessPaymentRequest {
  payment_id?: string;
}

export interface OrdersHealthResponse {
  status: string;
  service: string;
  [key: string]: unknown;
}

// ==============================================================================
// Modelos del Microservicio de Notificaciones Nexus (OAS 3.1 / Puerto 8005)
// ==============================================================================

export interface NotificationsHealthResponse {
  status: string;
  service: string;
  [key: string]: unknown;
}

export interface DigitalLicenseKey {
  product_id: string;
  product_title: string;
  key: string;
}

export interface DigitalReceiptItem {
  product_id: string;
  title: string;
  quantity: number;
  unit_price_clp: number;
  subtotal_clp: number;
  license_keys?: string[];
}

export interface DigitalReceipt {
  folio: string;
  order_id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  payment_method: {
    brand: string;
    last4: string;
    type: 'SIMULATED_CARD' | 'SIMULATED_TRANSFER' | 'WEBPAY_SANDBOX';
  };
  transaction_id: string;
  items: DigitalReceiptItem[];
  subtotal_neto_clp: number;
  iva_clp: number; // 19% IVA Chile
  total_clp: number;
  license_keys: DigitalLicenseKey[];
  issuer: {
    company: string;
    rut: string;
    address: string;
    activity: string;
  };
  email_sent: boolean;
  email_sent_at?: string;
}

export interface SendReceiptRequest {
  order_id: string;
  customer_name: string;
  customer_email: string;
  receipt: DigitalReceipt;
}

export interface SendReceiptResponse {
  success: boolean;
  message: string;
  order_id: string;
  recipient_email: string;
  sent_at: string;
}

// ==============================================================================
// Modelos del Microservicio de Recomendaciones Nexus (OAS 3.1 / Puerto 8006)
// ==============================================================================

export interface RecommendationResponse {
  product_id: string;
  title: string;
  price_clp: number;
  score: number;
  recommendation_reason: string;
  image_url?: string | null;
}

export interface RecommendationsHealthResponse {
  status: string;
  service: string;
  [key: string]: unknown;
}

export interface GetRecommendationsParams {
  limit?: number;
}

// ==============================================================================
// Modelos del Microservicio de Asistente IA Conversacional y RAG (OAS 3.1 / Puerto 8007)
// ==============================================================================

export interface ChatHistoryItem {
  role?: 'user' | 'assistant' | string;
  content?: string;
  [key: string]: unknown;
}

export interface ChatStreamRequest {
  query: string;
  message?: string | null;
  chat_history?: ChatHistoryItem[];
  session_id?: string | null;
}

export interface AssistantHealthResponse {
  status: string;
  service: string;
  [key: string]: unknown;
}

export interface ResetSessionResponse {
  status: string;
  session_id: string;
  [key: string]: unknown;
}



