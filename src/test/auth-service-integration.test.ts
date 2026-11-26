import { describe, it, expect, beforeAll } from 'vitest';
import { fetchClient, ApiError } from '@/infrastructure/api/fetchClient';
import type {
  TokenResponse,
  UserResponse,
  AuthInfoResponse,
  AuthHealthResponse,
  AuthGenericMessageResponse,
} from '@/domain/models';
import { policyPassword } from './passwords';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:8001';

describe('Nexus Auth Service & BFF Integration Tests (AWS Cognito Microservice)', () => {
  const testUser = {
    name: 'Coleccionista Test CI',
    email: `ci_user_${Date.now()}@nexus.com`,
    password: policyPassword(),
  };

  let authToken: string = '';
  let refreshToken: string = '';

  beforeAll(() => {
    // Asegurar variable de entorno para fetchClient en entorno jsdom de pruebas
    process.env.NEXT_PUBLIC_AUTH_API_URL = AUTH_URL;
    process.env.NEXT_PUBLIC_API_URL = AUTH_URL;
  });

  it('1. GET /api/v1/auth/health — Debe responder con status 200 y servicio activo', async () => {
    const health = await fetchClient<AuthHealthResponse>('/api/v1/auth/health');
    expect(health).toBeDefined();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('auth-service');
  });

  it('2. GET /api/v1/auth/info — Debe retornar la configuración activa de AWS Cognito', async () => {
    const info = await fetchClient<AuthInfoResponse>('/api/v1/auth/info');
    expect(info).toBeDefined();
    expect(info.auth_provider).toContain('AWS Cognito');
    expect(info.cognito_region).toBe('us-east-1');
  });

  it('3. POST /api/v1/auth/register — Debe registrar un nuevo usuario en Cognito con status 201', async () => {
    const newUser = await fetchClient<UserResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser),
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBeDefined();
    expect(newUser.email).toBe(testUser.email);
    expect(newUser.name).toBe(testUser.name);
    expect(newUser.role).toBe('customer');
  });

  it('4. POST /api/v1/auth/login — Debe autenticar contra Cognito y retornar tokens JWT (access, id, refresh)', async () => {
    const tokens = await fetchClient<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    expect(tokens).toBeDefined();
    expect(tokens.access_token).toBeDefined();
    expect(tokens.id_token).toBeDefined();
    expect(tokens.refresh_token).toBeDefined();
    expect(tokens.token_type).toBe('Bearer');
    expect(tokens.expires_in).toBeGreaterThan(0);

    authToken = tokens.access_token;
    refreshToken = tokens.refresh_token;

    // Verificar almacenamiento en localStorage
    localStorage.setItem('nexus_token', authToken);
    expect(localStorage.getItem('nexus_token')).toBe(authToken);
  });

  it('5. GET /api/v1/auth/me — Debe retornar el perfil del usuario autenticado con Bearer token', async () => {
    const profile = await fetchClient<UserResponse>('/api/v1/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(profile).toBeDefined();
    expect(profile.email).toBe(testUser.email);
    expect(profile.id).toBeDefined();
  });

  it('6. POST /api/v1/auth/refresh — Debe renovar los tokens usando el Refresh Token', async () => {
    const refreshed = await fetchClient<TokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken,
        email: testUser.email,
      }),
    });

    expect(refreshed).toBeDefined();
    expect(refreshed.access_token).toBeDefined();
    expect(refreshed.refresh_token).toBeDefined();
  });

  it('7. POST /api/v1/auth/confirm — Debe confirmar cuenta con código de verificación', async () => {
    const confirmRes = await fetchClient<AuthGenericMessageResponse>('/api/v1/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        confirmation_code: '123456',
      }),
    });

    expect(confirmRes).toBeDefined();
    expect(confirmRes.status).toBe('success');
  });

  it('8. POST /api/v1/auth/resend-code — Debe reenviar el código de verificación por query parameter', async () => {
    const resendRes = await fetchClient<AuthGenericMessageResponse>(
      `/api/v1/auth/resend-code?email=${encodeURIComponent(testUser.email)}`,
      {
        method: 'POST',
      }
    );

    expect(resendRes).toBeDefined();
    expect(resendRes.status).toBe('success');
  });

  it('9. POST /api/v1/auth/forgot-password — Debe solicitar código de restablecimiento de contraseña', async () => {
    const forgotRes = await fetchClient<AuthGenericMessageResponse>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
      }),
    });

    expect(forgotRes).toBeDefined();
    expect(forgotRes.status).toBe('success');
  });

  it('10. POST /api/v1/auth/reset-password — Debe restablecer la contraseña con el código', async () => {
    const resetRes = await fetchClient<AuthGenericMessageResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        confirmation_code: '123456',
        new_password: policyPassword(),
      }),
    });

    expect(resetRes).toBeDefined();
    expect(resetRes.status).toBe('success');
  });

  it('11. Manejo de Errores — Login con datos inválidos debe fallar con ApiError (422)', async () => {
    let caughtError: ApiError | null = null;
    try {
      await fetchClient('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          password: '',
        }),
      });
    } catch (error: unknown) {
      caughtError = error as ApiError;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    expect(caughtError?.status).toBe(422);
    expect(caughtError?.message).toContain('valid email');
  });
});

