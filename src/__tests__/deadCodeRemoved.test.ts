// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * OWASP A01/A03: superficie mínima. Rutas legadas que saltaban el BFF endurecido, código de
 * Amplify sin Hosted UI y dependencias sin uso se eliminaron y no deben volver.
 */
const root = resolve(process.cwd());
const REMOVED_FILES = [
  'src/app/api/games/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/orders/payment-methods/route.ts',
  'src/app/api/assistant/chat/route.ts',
  'src/application/hooks/useGames.ts',
  'src/application/hooks/useCheckout.ts',
  'src/application/actions/orders.ts',
  'src/presentation/providers/AmplifyConfigProvider.tsx',
  'src/components/auth/CognitoLoginButton.tsx',
  'src/infrastructure/bff/assistantApiClient.ts',
  'src/infrastructure/bff/authApiClient.ts',
  'src/infrastructure/bff/cartApiClient.ts',
  'src/infrastructure/bff/notificationsApiClient.ts',
  'src/infrastructure/bff/recommendationsApiClient.ts',
  'src/lib/apiClient.ts',
  'src/infrastructure/bff/fastApiClient.ts',
  'src/infrastructure/bff/catalogApiClient.ts',
  'src/infrastructure/bff/ordersApiClient.ts',
  'src/app/api/v1/video-games/route.ts',
  'src/presentation/components/3d/DeepSpaceCanvas.tsx',
  'src/presentation/components/3d/GalacticPortal3D.tsx',
  'src/presentation/components/3d/Hero3DCollectorStage.tsx',
  'src/presentation/components/background/GammaBackground.tsx',
];
const REMOVED_DEPS = ['aws-amplify', '@aws-amplify/auth', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'uuid'];

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (/\.(ts|tsx|mjs)$/.test(name) && !full.includes('deadCodeRemoved.test')) yield full;
  }
}

describe('código muerto eliminado', () => {
  it.each(REMOVED_FILES)('%s no existe', (file) => {
    expect(existsSync(join(root, file))).toBe(false);
  });

  it('no queda el hook que borraba juegos contra un endpoint inexistente', () => {
    const src = readFileSync(join(root, 'src/application/hooks/useVideoGamesQuery.ts'), 'utf8');
    expect(src).not.toContain('useDeleteGameMutation');
    expect(src).not.toContain('/api/v1/video-games');
  });

  it('package.json no declara dependencias sin uso', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const dep of REMOVED_DEPS) expect(all, dep).not.toHaveProperty(dep);
  });

  it('ningún módulo importa Amplify, el SDK de S3 ni uuid', () => {
    const offenders = [...sourceFiles(join(root, 'src'))].filter((f) =>
      /from ['"](aws-amplify|@aws-amplify\/|@aws-sdk\/|uuid['"])/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });
});
