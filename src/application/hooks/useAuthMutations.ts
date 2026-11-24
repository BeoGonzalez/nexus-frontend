import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchClient, ApiError } from '@/infrastructure/api/fetchClient';
import { orderKeys } from './useOrderMutations';
import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
  ConfirmSignUpRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthInfoResponse,
  AuthHealthResponse,
  AuthGenericMessageResponse,
} from '@/domain/models';

export { ApiError };

/** Respuesta del BFF tras login/refresh: sin tokens (viven en cookies HttpOnly). */
export interface SessionResponse {
  authenticated: boolean;
  expires_in: number;
}

/**
 * Cierra la sesión en el servidor (OWASP A07): el BFF borra las cookies HttpOnly de sesión.
 */
export async function logoutRequest(): Promise<void> {
  await fetchClient('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
}

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  info: () => [...authKeys.all, 'info'] as const,
  health: () => [...authKeys.all, 'health'] as const,
};

/**
 * Hook de Login: Autentica contra el microservicio Nexus Auth (Cognito/JWT) a través del BFF.
 * OWASP A04: los JWT quedan en cookies HttpOnly fijadas por el BFF; el navegador solo recibe
 * `{ authenticated, expires_in }` y nunca persiste tokens en localStorage/sessionStorage.
 */
export const useLoginMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<SessionResponse> => {
      return await fetchClient<SessionResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      queryClient.invalidateQueries({ queryKey: orderKeys.paymentMethods('me') });
    },
  });
};

/**
 * Hook de Registro: Registra un nuevo usuario en el User Pool de AWS Cognito
 */
export const useRegisterMutation = () => {
  return useMutation({
    mutationFn: async (userData: RegisterRequest): Promise<UserResponse> => {
      return await fetchClient<UserResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
  });
};

/**
 * Hook de Confirmación de Cuenta: Confirma el código de 6 dígitos enviado por correo
 */
export const useConfirmAccountMutation = () => {
  return useMutation({
    mutationFn: async (payload: ConfirmSignUpRequest): Promise<AuthGenericMessageResponse> => {
      return await fetchClient<AuthGenericMessageResponse>('/api/v1/auth/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
};

/**
 * Hook de Reenvío de Código: Reenvía el código de confirmación de cuenta
 */
export const useResendCodeMutation = () => {
  return useMutation({
    mutationFn: async (email: string): Promise<AuthGenericMessageResponse> => {
      return await fetchClient<AuthGenericMessageResponse>(
        `/api/v1/auth/resend-code?email=${encodeURIComponent(email)}`,
        { method: 'POST' }
      );
    },
  });
};

/**
 * Hook de Renovación de Tokens: Renueva tokens expirados usando el Refresh Token
 */
export const useRefreshTokenMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // El refresh token vive en una cookie HttpOnly: el cliente solo indica su correo.
    mutationFn: async (payload: Pick<RefreshTokenRequest, 'email'>): Promise<SessionResponse> => {
      return await fetchClient<SessionResponse>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ email: payload.email }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
};

/**
 * Hook de Recuperación de Contraseña (Forgot Password)
 */
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordRequest): Promise<AuthGenericMessageResponse> => {
      return await fetchClient<AuthGenericMessageResponse>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
};

/**
 * Hook de Restablecimiento de Contraseña (Reset Password con código)
 */
export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (payload: ResetPasswordRequest): Promise<AuthGenericMessageResponse> => {
      return await fetchClient<AuthGenericMessageResponse>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  });
};

/**
 * Query para obtener los datos del usuario autenticado (/api/v1/auth/me)
 */
export const useCurrentUserQuery = (enabled = true) => {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async (): Promise<UserResponse> => {
      return await fetchClient<UserResponse>('/api/v1/auth/me');
    },
    enabled: typeof window !== 'undefined' && enabled,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

/**
 * Query para verificar la configuración activa de AWS Cognito
 */
export const useAuthInfoQuery = () => {
  return useQuery({
    queryKey: authKeys.info(),
    queryFn: async (): Promise<AuthInfoResponse> => {
      return await fetchClient<AuthInfoResponse>('/api/v1/auth/info');
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
};

/**
 * Query para verificar la salud del microservicio de autenticación
 */
export const useAuthHealthQuery = () => {
  return useQuery({
    queryKey: authKeys.health(),
    queryFn: async (): Promise<AuthHealthResponse> => {
      return await fetchClient<AuthHealthResponse>('/api/v1/auth/health');
    },
    staleTime: 1000 * 30, // 30 segundos
  });
};
