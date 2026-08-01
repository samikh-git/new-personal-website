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
3. `wrangler deploy` on `main`, or `wrangler versions upload` on PRs (preview)

Add these GitHub Actions secrets (repo → Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Token with **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

Custom domain `blog.samikh.dev` is declared in [`wrangler.jsonc`](wrangler.jsonc) (`routes` + `custom_domain`). The zone `samikh.dev` must be on the same Cloudflare account.

Optional alternative: connect the repo in the Cloudflare dashboard under **Workers → Settings → Builds** (Workers Builds). The GitHub Action is enough on its own.

## Content

Posts live in [`src/content/blog/`](src/content/blog/) as Markdown with frontmatter (`title`, `description`, `pubDate`). Edit [`src/data/site.ts`](src/data/site.ts) for site metadata.

RSS: [`/rss.xml`](https://blog.samikh.dev/rss.xml)

## Stack

- Astro 7 (static)
- Bun
- Cloudflare Workers static assets (`wrangler.jsonc`)
- GitHub Actions → Wrangler
