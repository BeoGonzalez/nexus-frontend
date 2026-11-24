// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Propiedades de seguridad del pipeline DevSecOps del frontend (OWASP A03/A08). */
const root = resolve(process.cwd());
const path = join(root, '.github/workflows/devsecops-frontend.yml');
const wf = existsSync(path) ? readFileSync(path, 'utf8') : '';

describe('devsecops-frontend.yml', () => {
  it('existe', () => {
    expect(wf).not.toBe('');
  });

  it('toda acción de terceros está fijada por un SHA de 40 caracteres', () => {
    const uses = [...wf.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThan(8);
    expect(uses.filter((u) => !/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(u))).toEqual([]);
  });

  it('permisos por defecto de solo lectura; id-token solo en el job que firma', () => {
    expect(wf).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m);
    // Solo líneas de configuración (los comentarios pueden mencionarlo).
    expect((wf.match(/^\s+id-token: write/gm) ?? []).length).toBe(1);
  });

  it.each([
    ['Gitleaks sobre historial', /gitleaks git /],
    ['Gitleaks sobre árbol', /gitleaks dir /],
    ['instalación con lockfile congelado', /pnpm install --frozen-lockfile/],
    ['audit de producción', /pnpm audit --prod --audit-level high/],
    ['ESLint', /pnpm lint/],
    ['tsc', /pnpm typecheck/],
    ['tests', /pnpm vitest run/],
    ['build', /pnpm build/],
    ['secretos fuera del bundle', /pnpm check:bundle-secrets/],
    ['Semgrep con los rulesets pedidos', /--config p\/typescript --config p\/react --config p\/nextjs --config p\/owasp-top-ten/],
    ['Semgrep bloqueante', /semgrep scan[\s\S]*?--error/],
    ['Hadolint', /hadolint/],
    ['Trivy HIGH/CRITICAL bloqueante', /severity: HIGH,CRITICAL[\s\S]*?ignore-unfixed: true[\s\S]*?exit-code: "1"/],
    ['SBOM CycloneDX', /format: cyclonedx/],
    ['Cosign keyless', /cosign sign --yes/],
    ['provenance', /actions\/attest-build-provenance@/],
  ])('incluye el gate: %s', (_name, re) => {
    expect(wf).toMatch(re);
  });

  it('solo publica en push a main, con credenciales temporales del Learner Lab', () => {
    expect(wf).toMatch(/PUBLISH: \$\{\{ github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' \}\}/);
    expect(wf).toMatch(/aws-session-token: \$\{\{ secrets\.AWS_SESSION_TOKEN \}\}/);
    // Cada paso de publicación (bloque `- name/uses` del job) debe estar condicionado a PUBLISH.
    const steps = wf.split(/\n(?=\s{6}- )/);
    for (const action of ['configure-aws-credentials', 'amazon-ecr-login', 'cosign-installer', 'attest-build-provenance']) {
      const step = steps.find((b) => new RegExp(`uses: [\\w-]+/${action}@`).test(b));
      expect(step, action).toBeDefined();
      expect(step, action).toMatch(/if: env\.PUBLISH == 'true'/);
    }
  });

  it('publica con tag inmutable = SHA del commit en el repositorio de vars', () => {
    expect(wf).toContain('${{ vars.ECR_REPOSITORY_FRONTEND }}');
    expect(wf).toMatch(/:\$\{GITHUB_SHA\}/);
  });

  it('no modifica infraestructura (ni ASG ni Terraform)', () => {
    // Se permiten como texto en el resumen (echo), nunca como comando ejecutado.
    expect(wf).not.toMatch(/^\s*(terraform\s+(apply|plan)|aws\s+autoscaling|make\s+frontend-roll)/m);
    expect(wf).not.toMatch(/start-instance-refresh/);
  });

  it('pasa al build las variables públicas que Next incrusta (región de la CSP y hosts de imágenes)', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    for (const name of ['NEXT_PUBLIC_AWS_REGION', 'NEXT_PUBLIC_IMAGE_HOSTS']) {
      expect(dockerfile).toMatch(new RegExp(`^ARG ${name}`, 'm'));
      expect(wf).toContain(`${name}=\${{ vars.${name} }}`);
    }
  });
});
