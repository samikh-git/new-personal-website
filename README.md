# Sami Houssaini — Blog

Personal blog about agent tooling, CLIs, and sandboxed developer platforms. Built with [Astro](https://astro.build/) and deployed to [Cloudflare Workers](https://workers.cloudflare.com/) at [blog.samikh.dev](https://blog.samikh.dev).

## Setup

Requires [Bun](https://bun.sh/) 1.3+.

```bash
bun install
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Local Astro dev server |
| `bun run build` | Static build to `dist/` |
| `bun run preview` | Preview the production build |
| `bun run deploy` | Build and deploy to Cloudflare Workers via Wrangler |

## Deploy / CI

Pushes to `main` and pull requests run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. `bun install --frozen-lockfile`
2. `bun run build`
3. `wrangler deploy` on `main` (**production** environment), or `wrangler versions upload` on PRs (**preview** environment)

### One-time GitHub Environment setup

Environment name must be exactly **`deploy`** (matches the workflow).

1. Open https://github.com/samikh-git/new-personal-website/settings/environments
2. Open the **`deploy`** environment (create it if missing)
3. Under **Environment secrets** (not repository secrets), add:

| Name | Value |
|------|--------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Edit Cloudflare Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

4. Confirm the names match **exactly** (no typos, no trailing spaces)
5. Re-run the failed workflow: Actions → failed run → **Re-run all jobs**

Do **not** put these only under Settings → Secrets and variables → Actions (repo secrets). With `environment: deploy`, only **environment** secrets are available to that job.

### Cloudflare API token (exact)

1. https://dash.cloudflare.com/profile/api-tokens → **Create Token**
2. Use template **Edit Cloudflare Workers** (or Custom with Account → Workers Scripts: Edit, Account → Account Settings: Read, and Zone → Workers Routes: Edit on `samikh.dev`)
3. Account Resources: include only the account that owns `samikh.dev`
4. Zone Resources: include `samikh.dev` (needed for the `blog.samikh.dev` custom domain route)
5. Create token → copy once into both GitHub Environment secrets

Account ID: Cloudflare dashboard → any domain or Workers → right sidebar / overview → **Account ID**.

Custom domain `blog.samikh.dev` is declared in [`wrangler.jsonc`](wrangler.jsonc). First successful `production` deploy attaches it when the zone is on that account.

## Observability

Enabled in [`wrangler.jsonc`](wrangler.jsonc):

- **Workers Logs** + invocation logs (`observability.logs`)
- **Traces** (`observability.traces`)
- **Analytics Engine** dataset `blog_views` via binding `ANALYTICS`
- Request logging Worker in [`worker/index.ts`](worker/index.ts) (path, status, latency, country, colo)

After deploy, view logs/traces: Cloudflare dashboard → Workers → `sami-personal-website` → **Observability**.

Query page views (SQL API / Analytics Engine):

```sql
SELECT
  index1 AS path,
  blob1 AS country,
  SUM(_sample_interval) AS views
FROM blog_views
WHERE timestamp > NOW() - INTERVAL '1' DAY
GROUP BY path, country
ORDER BY views DESC
```

### Console noise (not from this site)

- `static.cloudflareinsights.com/beacon.min.js` / `ERR_CONNECTION_REFUSED` — usually an ad blocker, DNS filter, or a Cloudflare Web Analytics / RUM snippet injected outside this repo. Our HTML does not include that script. Check **Web Analytics** / **Zaraz** on the `samikh.dev` zone, or disable the blocker for this host.
- `mf.js` / `Params are not set` and `runtime.lastError: Receiving end does not exist` — typical browser-extension noise (e.g. wallets), not application code.

## Content

- Blog posts: [`src/content/blog/`](src/content/blog/) (Markdown)
- Site pages: [`src/content/pages/`](src/content/pages/) (Markdown → `/[slug]/`)

Page frontmatter: `title`, `description`, optional `showAvatar`, optional `draft`.

RSS: [`/rss.xml`](https://blog.samikh.dev/rss.xml)

Custom error pages: [`src/pages/404.astro`](src/pages/404.astro), [`src/pages/500.astro`](src/pages/500.astro). Cloudflare serves `404.html` for unknown routes; the Worker serves `500.html` on upstream failures.

## Stack

- Astro 7 (static)
- Bun
- Cloudflare Workers static assets (`wrangler.jsonc`)
- GitHub Actions → Wrangler
