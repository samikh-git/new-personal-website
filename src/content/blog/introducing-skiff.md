---
title: Introducing skiff
description: A Rust CLI that turns MCP, OpenAPI, and GraphQL into commands agents can call, without codegen, tuned for warm discovery.
pubDate: 2026-07-31
---

Agents talk to tools constantly. On a fat MCP server (Cloudflare's docs catalog is a good example), a cold call can mean spawning a process, negotiating a transport, and shipping a multi-megabyte `list_tools` payload just so the agent can pick one function. You pay for that in wall time and in context tokens.

I wanted a runtime CLI agents could use like any other shell tool: discover a little at a time, keep a warm path, and stay quiet when the answer is huge. That project is **[skiff](https://github.com/samikh-git/skiff)** (crates.io package `skiff-cli`). It takes the idea behind Python [mcp2cli](https://github.com/knowsuchagency/mcp2cli) and reimplements it in Rust for latency and agent-friendly defaults, not as a line-for-line port.

## One binary, three source kinds

Point skiff at a source and treat operations as subcommands:

```bash
# OpenAPI
skiff --spec ./openapi.json --base-url https://api.example.com list-pets --limit 5

# MCP stdio
skiff --mcp-stdio "npx -y @modelcontextprotocol/server-filesystem /tmp" \
  read-file --path /tmp/hello.txt

# MCP HTTP (streamable, with SSE fallback)
skiff --mcp http://127.0.0.1:8000/mcp --list

# GraphQL
skiff --graphql http://127.0.0.1:4000 --fields "id name" user --id 1
```

Discovery is progressive. Flags like `--list`, `--search`, `--detail names|brief|full`, `--describe`, and `--agent` (or `SKIFF_AGENT=1`) bias toward compact JSON that fits an agent loop. Oversized results land in a spool directory with a short pointer on stdout you can `rg` later.

## Sessions: stop paying initialize every time

On Unix, skiff can keep a long-lived MCP client behind a Unix-domain socket:

```bash
skiff --mcp-stdio "python3 ./server.py" --session-start myfs
skiff --session myfs --list
skiff --session myfs echo --message hi
skiff --session-stop myfs
```

The agent skips the `npx`/initialize tax on every call. Socket permissions are locked down (`0o600`, same-UID peer check). Idle timeout defaults to 30 minutes. Windows sessions aren't shipped yet.

## Bake, spool, and secrets

Named configs (`skiff bake create …` then `skiff @name …`) keep recurring sources out of every prompt. Spool keeps fat tool output off the transcript. Auth headers and OAuth client material prefer `env:` / `file:` prefixes so secrets don't land on argv.

There's an agent skill too:

```bash
npx skills add samikh-git/skiff
```

Or install the binary with Homebrew (`brew tap samikh-git/tools && brew install skiff`) or `cargo install skiff-cli`.

## Warm discovery is the point

I measured skiff against upstream Python mcp2cli on Cloudflare's MCP (10 warm runs, isolated cache dirs, wall clock including process spawn). Approximate medians from that harness:

| Scenario | Rust warm | Python warm |
|----------|----------:|------------:|
| Docs MCP `--list --json --compact` | ~8 ms | ~575 ms |
| Fat catalog `--search workers --json --compact --top 20` | ~10 ms | ~3.2 s |
| Fat catalog `--list --json --compact` | ~13 ms | ~1.8 s |

After the cold fetch, Rust stays near 10 ms. Warm discovery reads a slim on-disk tools index (names plus sparse overrides; postings rebuilt in memory) or, with `--session`, searches an in-daemon RAM index over Unix IPC. Python's warm path on that catalog still often paid seconds.

Caveats: stdout shapes aren't identical, token estimates are heuristic (`ceil(bytes/4)`), and the Python side needed an SDK pin for a fair streamable run. The clearest gap is warm discovery latency on large catalogs, which is what the compact index and session path are for. For context size, progressive `--detail` / `--top` / `--agent` still matter more than raw CLI speed.

## What's next

Shipped: OpenAPI, MCP stdio/HTTP (streamable + SSE), OAuth, GraphQL, Unix sessions, bake/`@name`, spool, native `--toon`, and agent-oriented defaults. Still open: Windows sessions, and mid-daemon OAuth refresh when the token TTL is shorter than idle.

If you're wiring agents to MCP or OpenAPI and the cold path is chewing your loop, try skiff and file issues on [GitHub](https://github.com/samikh-git/skiff).
