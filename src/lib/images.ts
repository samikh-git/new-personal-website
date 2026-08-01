/** Source asset served from Workers static assets; transformed via Cloudflare Images. */
export const AVATAR_SOURCE = '/avatar.png';

/** Matches CSS `object-position: 36% 48%` on `.avatar`. */
export const AVATAR_GRAVITY = { x: 0.36, y: 0.48 } as const;

const AVATAR_ROUTE = '/img/avatar';

/**
 * Build a Cloudflare Images transform URL handled by the Worker.
 * In `astro dev` (no Worker), falls back to the raw PNG.
 */
export function avatarUrl(options: {
  width: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'scale-down';
  format?: 'auto' | 'jpeg' | 'webp' | 'avif' | 'png';
}): string {
  if (import.meta.env.DEV) {
    return AVATAR_SOURCE;
  }

  const params = new URLSearchParams();
  params.set('w', String(options.width));
  params.set('h', String(options.height ?? options.width));
  params.set('fit', options.fit ?? 'cover');
  if (options.format && options.format !== 'auto') {
    params.set('f', options.format);
  }
  return `${AVATAR_ROUTE}?${params.toString()}`;
}

export function avatarImg(cssPx = 56) {
  const w1 = cssPx;
  const w2 = cssPx * 2;
  return {
    src: avatarUrl({ width: w1 }),
    srcset: import.meta.env.DEV
      ? undefined
      : `${avatarUrl({ width: w1 })} 1x, ${avatarUrl({ width: w2 })} 2x`,
    width: cssPx,
    height: cssPx,
  };
}

/** Absolute OG/Twitter image (forced JPEG for crawlers). */
export function avatarOgUrl(site: URL | string): string {
  const base = typeof site === 'string' ? site : site.href;
  const path = avatarUrl({ width: 1200, height: 630, fit: 'cover', format: 'jpeg' });
  return new URL(path, base).href;
}
