import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { downloads, installCommand, releaseUrl, repositoryUrl, version } from '../src/lib/distribution';

const app = JSON.parse(readFileSync(new URL('../../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const page = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

describe('macOS distribution', () => {
  test('matches the application version and minimum macOS version', () => {
    expect(version).toBe(app.version);
    expect(app.bundle.macOS.minimumSystemVersion).toBe('13.3');
    expect(app.bundle.macOS.signingIdentity).toBe('-');
  });

  test('provides a shell-valid command for the public tap', () => {
    expect(installCommand.replace(/\\\n\s*/g, '')).toBe('brew install --cask AungMyoKyaw/homebrew-tap/receipts');
  });

  test('pins both installer architectures to the same release', () => {
    expect(releaseUrl).toBe(`${repositoryUrl}/releases/tag/v${version}`);
    expect(downloads).toEqual([
      { label: 'Apple Silicon', url: `${repositoryUrl}/releases/download/v${version}/Receipts_${version}_aarch64.dmg` },
      { label: 'Intel', url: `${repositoryUrl}/releases/download/v${version}/Receipts_${version}_x64.dmg` }
    ]);
  });

  test('documents installation, updates, first launch approval, and licensing', () => {
    expect(page).toContain('brew upgrade --cask AungMyoKyaw/homebrew-tap/receipts');
    expect(page).toContain('Open Anyway');
    expect(page).toContain('not notarized');
    expect(page).toContain('AGPL-3.0-or-later');
    expect(page).not.toContain('currently a source build');
  });
});
