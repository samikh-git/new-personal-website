# AGENTS.md — personal blog

Guidance for coding agents working in this repo.

## Stack

- **Astro 7** static site + thin Cloudflare Worker ([`worker/index.ts`](worker/index.ts))
- **Bun** for install/scripts (`bun install`, `bun run …`)
- Deploy: GitHub Actions → Wrangler → `blog.samikh.dev` only (`workers_dev` / `preview_urls` are off)

## Commands

```bash
bun install
bun run dev
bun run build
bun run deploy   # local; CI uses the deploy GitHub Environment
```

## Content

| Kind | Path | Route |
|------|------|--------|
| Blog posts | `src/content/blog/*.md` | `/blog/[slug]/` |
| Pages | `src/content/pages/*.md` | `/[slug]/` |

Blog frontmatter: `title`, `description`, `pubDate`, optional `updatedDate`, `draft`.

Page frontmatter: `title`, `description`, optional `showAvatar`, `draft`.

Site meta: [`src/data/site.ts`](src/data/site.ts). RSS: `/rss.xml`.

### Humanizer (required for prose)

All user-facing writing (blog posts, about/pages, post `description` fields, and any new marketing copy) **must** go through the project [humanizer](.agents/skills/humanizer/SKILL.md) skill before shipping.

- Read and follow `.agents/skills/humanizer/SKILL.md` (file mode when editing Markdown).
- Preserve facts; do not invent names, numbers, dates, or citations.
- Match a direct technical-blog voice: specific, uneven rhythm, no AI filler, no em/en dashes.
- Leave code blocks, frontmatter keys, URLs, and command examples untouched.
- After drafting or rewriting content, run the skill's draft → audit → final loop before considering the change done.

## Layout / design

- Flue-inspired light blog chrome (not a marketing landing page)
- Tokens and prose styles: [`src/styles/global.css`](src/styles/global.css)
- Blog and page Markdown body text is **justified** (`text-align: justify`); keep headings left-aligned
- Do not add dark mode, purple gradients, or card-heavy hero layouts

## Worker / ops

- [`wrangler.jsonc`](wrangler.jsonc): custom domain `blog.samikh.dev`, observability, Analytics Engine `blog_views`, Images binding `IMAGES`, Workers Cache enabled
- Avatar display uses Cloudflare Images via `/img/avatar?w=&h=&fit=` ([`worker/index.ts`](worker/index.ts)); source file stays at `public/avatar.png`
- Custom errors: `src/pages/404.astro`, `src/pages/500.astro` → Worker serves branded `500.html` on asset failures
- CI: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) uses GitHub Environment **`deploy`** (secrets live there, not repo-level)

## Do not

- Commit secrets, `.env`, or Cloudflare tokens
- Re-enable `workers_dev` / `preview_urls` unless asked
- Replace Markdown content collections with a CMS unless explicitly requested
- Ship blog/about copy without running the humanizer skill
