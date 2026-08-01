export interface Env {
  ASSETS: Fetcher;
  ANALYTICS: AnalyticsEngineDataset;
  IMAGES: ImagesBinding;
}

const AVATAR_SOURCE = '/avatar.png';
/** Matches CSS object-position on .avatar */
const AVATAR_GRAVITY = { x: 0.36, y: 0.48, mode: 'box-center' as const };

function country(request: Request): string {
  const cf = request.cf as { country?: string } | undefined;
  return cf?.country ?? 'XX';
}

function negotiateFormat(
  request: Request,
  forced?: string | null,
): ImageOutputOptions['format'] {
  if (forced === 'jpeg' || forced === 'jpg') return 'image/jpeg';
  if (forced === 'webp') return 'image/webp';
  if (forced === 'avif') return 'image/avif';
  if (forced === 'png') return 'image/png';

  const accept = request.headers.get('Accept') ?? '';
  if (/image\/avif/i.test(accept)) return 'image/avif';
  if (/image\/webp/i.test(accept)) return 'image/webp';
  return 'image/jpeg';
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function serveOptimizedAvatar(request: Request, env: Env, url: URL): Promise<Response> {
  const width = clampInt(url.searchParams.get('w'), 112, 16, 2400);
  const height = clampInt(url.searchParams.get('h'), width, 16, 2400);
  const fitParam = url.searchParams.get('fit') ?? 'cover';
  const fit =
    fitParam === 'contain' || fitParam === 'scale-down' || fitParam === 'cover'
      ? fitParam
      : 'cover';
  const format = negotiateFormat(request, url.searchParams.get('f'));
  const quality = clampInt(url.searchParams.get('q'), 85, 1, 100);

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const sourceUrl = new URL(AVATAR_SOURCE, url.origin);
  const source = await env.ASSETS.fetch(new Request(sourceUrl, request));
  if (!source.ok || !source.body) {
    return new Response('Avatar not found', { status: 404 });
  }

  try {
    const transformed = await env.IMAGES.input(source.body)
      .transform({
        width,
        height,
        fit,
        gravity: AVATAR_GRAVITY,
      })
      .output({ format, quality });

    const imageResponse = transformed.response();
    const headers = new Headers(imageResponse.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Vary', 'Accept');

    const response = new Response(imageResponse.body, {
      status: 200,
      headers,
    });

    // Cache successful transforms (fire-and-forget).
    void cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('image_transform_failed', {
      error: error instanceof Error ? error.message : String(error),
      width,
      height,
      format,
    });
    // Fall back to the original asset so the page still renders.
    return env.ASSETS.fetch(new Request(sourceUrl, request));
  }
}

async function errorPage(
  env: Env,
  request: Request,
  status: number,
  fallbackText: string,
): Promise<Response> {
  const errorUrl = new URL(`/${status}.html`, request.url);
  try {
    const asset = await env.ASSETS.fetch(new Request(errorUrl, request));
    if (asset.ok) {
      return new Response(asset.body, {
        status,
        headers: asset.headers,
      });
    }
  } catch (error) {
    console.error('error_page_fetch_failed', {
      status,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return new Response(fallbackText, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const started = Date.now();
    const colo = (request.cf as { colo?: string } | undefined)?.colo ?? 'unknown';
    const ray = request.headers.get('cf-ray') ?? '';
    const ua = request.headers.get('user-agent') ?? '';

    if (request.method === 'GET' && url.pathname === '/img/avatar') {
      return serveOptimizedAvatar(request, env, url);
    }

    let response: Response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('asset_fetch_failed', {
        path: url.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
      });
      return errorPage(env, request, 500, 'Something went wrong.');
    }

    // If the asset layer returned a bare 5xx, prefer the branded error page.
    if (response.status >= 500) {
      response = await errorPage(env, request, 500, 'Something went wrong.');
    }

    const status = response.status;
    const ms = Date.now() - started;

    console.log('request', {
      method: request.method,
      path: url.pathname,
      status,
      ms,
      country: country(request),
      colo,
      ray,
    });

    const isAsset =
      /\.(css|js|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|txt|xml)$/i.test(url.pathname) ||
      url.pathname.startsWith('/_astro/') ||
      url.pathname.startsWith('/img/');

    if (!isAsset && request.method === 'GET') {
      try {
        env.ANALYTICS.writeDataPoint({
          indexes: [url.pathname],
          blobs: [country(request), colo, status.toString(), ua.slice(0, 100)],
          doubles: [1, ms],
        });
      } catch (error) {
        console.error('analytics_write_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return response;
  },
} satisfies ExportedHandler<Env>;
