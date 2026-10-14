import type { ThemeManifest } from '../core/theme-types';
import type { BridgeRepository } from '../studio/bridge-repository';
import { setInstalledThemes, type InstalledTheme } from './registry';

let latest = 0;

/** Fetches the workspace's installed themes from the Bridge and makes them available to the editor. */
export async function loadInstalledThemes(repository: Pick<BridgeRepository, 'request'>) {
  const request = ++latest;
  const { themes } = await repository.request<{ themes: Array<ThemeManifest & { source: 'builtin' | 'installed' }> }>('/api/themes');
  const packages: InstalledTheme[] = await Promise.all(themes.filter((theme) => theme.source === 'installed').map(async ({ source: _source, ...manifest }) => {
    const response = await fetch(`/api/themes/${manifest.id}/theme.css`, { credentials: 'same-origin', signal: AbortSignal.timeout(35000) });
    if (!response.ok) throw new Error(`主题「${manifest.name}」的样式读取失败（HTTP ${response.status}）`);
    return { manifest, css: await response.text() };
  }));
  // Install and remove events can arrive close together; only the newest answer is applied.
  if (request === latest) setInstalledThemes(packages);
}
