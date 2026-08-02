---
title: Building Fives
description: A 2-captain live bidding draft for 5-a-side squads on Cloudflare Durable Objects, with share cards and a public vote layer.
pubDate: 2026-08-02
---

I wanted a small multiplayer game that felt like arguing over a transfer window, not like filling out a fantasy spreadsheet. Two captains draft five-a-side squads from a shared pool of ten, under a fixed budget, bidding until one of them passes. That project is **[Fives](https://fives.samikh.dev)** ([source](https://github.com/samikh-git/fives)).

## The game in one minute

One captain builds a pool of exactly 10 players (exactly 2 goalkeepers in the pool; your final five does not have to include one). They send a join link. The other captain opens it. No accounts: the link *is* the credential, and both tokens live in localStorage.

Players come out one at a time in a random order fixed at create time. First bidder alternates each round and must open; after that you raise by at least $5M or pass. A pass settles the round at the current bid. Each captain starts with $250M, and you cannot bid so high that the remaining squad slots become impossible to fill. When both have five players, you get side-by-side squads with prices paid. Captains can also set a display name and chat live during the game, both shown next to the bidding.

## Why a Durable Object

Realtime bidding needs one room with one authoritative state. Fives puts each game in a SQLite-backed Durable Object (`GameRoom`). Mutations go through plain methods that return `{ok, state}` or `{ok:false, code, message}` instead of throwing. That's not a style preference: throwing custom errors across the DO RPC boundary was crashing `vitest-pool-workers`'s isolated-storage bookkeeping, so the return-based shape is load-bearing, not decoration. Every write lands in the DO's own SQLite storage; there is no in-memory-only cache that hibernation can wipe.

WebSockets use the Hibernation API. Heartbeats get an auto-response so pings do not wake the room. Idle games get a DO alarm TTL (2 days) separate from the D1 sweep that eventually deletes abandoned game rows (7 days). Those are easy to conflate and wrong to treat as the same timer.

The protocol detail that bit me early: every mutating message (`propose_next_player`, `place_bid`, `pass`) broadcasts its specific event *and then* a fresh `state_snapshot`. The client only applies snapshots. Hand-parsing partial events into local state looks clever until the UI and the room disagree. Authoritative snapshots are boring and correct.

## Rules that live in one place

Budget reserve math sits in `src/shared/rules.ts` (`computeReserve`, `computeMaxLegalBid`, `isLegalBid`). The Durable Object enforces it. The React bid controls import the same functions for clamp-and-hint UX only. Shared constants for pool size, squad size, starting budget, and min increment mean the frontend cannot invent a different game than the server runs.

The same idea holds for the message contract in `src/shared/protocol.ts`: one typed `ClientMessage`/`ServerMessage` union, imported by both sides. A shape the client and server disagree about fails to compile instead of failing at runtime in the middle of a bid war.

## The rest of the Worker

Around the room, a Hono app on the same Worker handles rosters and games over REST: D1 holds players, completed results, votes, and comments; R2 holds roster photos; Workers rate limits sit in front of game creation, voting, and commenting. Building a pool for a new game is either a random draw (optionally filtered by league, club, or nation) or a hand-picked list of 10 ids, and both paths enforce the same goalkeeper quota.

## Publishing takes two yeses

A completed game doesn't go public on its own. Both captains have to consent, over the game's own WebSocket. Once they both have, the room mints a public slug, opens a 2-hour voting window, and the matchup shows up on a public feed anyone can browse. Voting is anonymous: a random id in localStorage stands in for an account, and a repeat vote from the same browser is a no-op instead of an error. A cron job every 15 minutes clears expired public posts and, for captains who opted in, emails them via Resend once voting closes.

## Share cards, cheaply

Share images are pitch PNGs, rendered with Satori and `@cf-wasm/resvg` and pointed at from OG tags, so a link dropped in Slack or iMessage unfurls the actual squad instead of a generic app icon. They're cached through the Cache API so a repeat request doesn't re-render anything. The Satori/resvg dependency chain loads through a dynamic `import()` inside the handler, so a cold start that never renders a card never pays for loading it.

## Tests that match the runtime

Unit tests cover the frontend and the pure shared logic under jsdom. Workers-runtime tests hit real D1 and Durable Object bindings through `@cloudflare/vitest-pool-workers`, not mocks. Across roughly 33 suites, the game-room tests alone run around 75 cases through `runInDurableObject`. That split matters: only real bindings could have surfaced the bug that pushed me toward return-based errors in the first place, the one where throwing crashed this same runner's storage bookkeeping. A mocked DO would have stayed green.

## What I would not claim

There are no accounts and no multi-tenant roster scoping: everyone shares one roster. Captain identity is a bearer token in a URL. Auto-pass, for when a bid would exceed remaining budget, is still unfinished. Fives is an auction room with a light social layer on top, not a fantasy platform.

If you want to find out whether you can out-haggle a friend under a budget that makes you both a little petty about it, try [fives.samikh.dev](https://fives.samikh.dev). Issues and PRs welcome on [GitHub](https://github.com/samikh-git/fives).
