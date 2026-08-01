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

First deploy requires Cloudflare auth (`bunx wrangler login`). Production custom domain: `blog.samikh.dev`.

## Content

Posts live in [`src/content/blog/`](src/content/blog/) as Markdown with frontmatter (`title`, `description`, `pubDate`). Edit [`src/data/site.ts`](src/data/site.ts) for site metadata.

RSS: [`/rss.xml`](https://blog.samikh.dev/rss.xml)

## Stack

- Astro 7 (static)
- Bun
- Cloudflare Workers static assets (`wrangler.jsonc`)
