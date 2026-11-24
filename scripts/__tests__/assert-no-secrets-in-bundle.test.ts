// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findSecretsInBundle } from '../assert-no-secrets-in-bundle.mjs';

const dirs: string[] = [];
function bundle(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'bundle-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const full = join(dir, name);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

describe('assert-no-secrets-in-bundle (A02/A04)', () => {
  it('detecta el valor canario en cualquier chunk estático', () => {
    const dir = bundle({ 'chunks/app.js': 'const k="CANARY-123456";', 'css/a.css': 'a{}' });
    expect(findSecretsInBundle(dir, ['CANARY-123456'])).toEqual([join(dir, 'chunks', 'app.js')]);
  });

  it('no reporta nada si el valor no aparece', () => {
    const dir = bundle({ 'chunks/app.js': 'console.log(1)' });
    expect(findSecretsInBundle(dir, ['CANARY-123456'])).toEqual([]);
  });

  it('exige secretos de al menos 8 caracteres (evita falsos positivos triviales)', () => {
    const dir = bundle({ 'a.js': 'x' });
    expect(() => findSecretsInBundle(dir, ['abc'])).toThrow();
  });
});
