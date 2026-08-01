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

## Content

Posts live in [`src/content/blog/`](src/content/blog/) as Markdown with frontmatter (`title`, `description`, `pubDate`). Edit [`src/data/site.ts`](src/data/site.ts) for site metadata.

RSS: [`/rss.xml`](https://blog.samikh.dev/rss.xml)

## Stack

- Astro 7 (static)
- Bun
- Cloudflare Workers static assets (`wrangler.jsonc`)
- GitHub Actions → Wrangler
