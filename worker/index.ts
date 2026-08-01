export interface Env {
  ASSETS: Fetcher;
  ANALYTICS: AnalyticsEngineDataset;
}

function country(request: Request): string {
  const cf = request.cf as { country?: string } | undefined;
  return cf?.country ?? 'XX';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const started = Date.now();
    const colo = (request.cf as { colo?: string } | undefined)?.colo ?? 'unknown';
    const ray = request.headers.get('cf-ray') ?? '';
    const ua = request.headers.get('user-agent') ?? '';

    let response: Response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch (error) {
      console.error('asset_fetch_failed', {
        path: url.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response('Upstream asset fetch failed', { status: 502 });
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

    // Page-view style analytics (skip obvious static assets).
    const isAsset =
      /\.(css|js|map|png|jpe?g|gif|svg|ico|webp|woff2?|txt|xml)$/i.test(url.pathname) ||
      url.pathname.startsWith('/_astro/');

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
