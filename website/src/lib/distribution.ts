export const version = '0.1.0';
export const repositoryUrl = 'https://github.com/AungMyoKyaw/receipts';
export const releaseUrl = `${repositoryUrl}/releases/tag/v${version}`;
export const installCommand = 'brew install --cask \\\n  AungMyoKyaw/homebrew-tap/receipts';
export const downloads = [
  { label: 'Apple Silicon', architecture: 'aarch64' },
  { label: 'Intel', architecture: 'x64' }
].map(({ label, architecture }) => ({
  label,
  url: `${repositoryUrl}/releases/download/v${version}/Receipts_${version}_${architecture}.dmg`
}));
