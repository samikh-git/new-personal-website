---
title: Replicate after Cloudflare
description: Workers AI gaps, Replicate as the HTTP escape hatch, Cog packaging, and what I'd change after the acquisition (nothing yet).
pubDate: 2026-08-02
---

Workers AI is the easy path when the model is already on the roster. The second you need something weird or community-tuned, you leave that binding and call someone else's HTTP API. For a lot of agent work that someone has been Replicate.

I ship this site on Workers and write about agent tooling. [Cloudflare's November 2025 acquisition of Replicate](https://blog.cloudflare.com/replicate-joins-cloudflare/) (Rita Kozlov and Ben Firshman) lands in that overlap. The escape hatch I reach for when Workers AI does not have the model is moving onto the same platform as the rest of the stack.

## Predictions over HTTP

Replicate runs ML models behind a prediction API. You POST a model version and an input object. They schedule hardware, run a container, and return output or a prediction id. Official models use `owner/name`. Community models pin a version hash. That pin is the difference between a playground demo and something that survives the weekend.

Two modes:

- Sync (`Prefer: wait`): the request blocks until the model finishes, or until a short timeout. Fine when the run is a few seconds.
- Async (default): you get a prediction id immediately, then poll or take a webhook until `succeeded` or `failed`.

Python and JavaScript clients exist. The HTTP surface is small enough that a Worker can call it with `fetch` and a bearer token in a secret. In agent loops I lean async, with a queue or Durable Object holding the prediction id. Sync fits the occasional short call where blocking beats wiring a callback.

## Cog is why the catalog exists

[Cog](https://github.com/replicate/cog) packages a model and its dependencies as a Docker image with a predictable predict interface. Push the image, get an API. Publishing is closer to shipping a container than standing up a serving stack, which is how the catalog got past 50,000 open-source models and fine-tunes.

The acquisition post says Cloudflare wants that Cog path for custom models on Workers AI. If it lands, the packaging format people already use on Replicate becomes an on-ramp to edge inference too. Until then, Cog is still why community weights show up as an HTTP endpoint instead of a repo you have to serve yourself.

## Cold starts, bills, and bad READMEs

Community quality is uneven. Some listings are polished. Some are a weekend experiment whose README lies about VRAM. Cold starts can stretch into tens of seconds while a GPU wakes and loads weights. Per-second GPU billing is honest, and an agent that loops a heavy video model will still surprise you on the invoice.

In practice that means pinning community versions, preferring official models when latency matters, and caching or queuing when the same input shows up twice. Budget for cold starts instead of finding them in production. Replicate is a marketplace with an API, not a curated SLA for every listing. That is fine for prototypes and long-tail models, and a bad assumption for a product's critical path.

## What I'm waiting for

Existing Replicate APIs keep working. The stated plan is catalog and fine-tuning on Workers AI, Cog-backed custom models, and AI Gateway as a control plane across Cloudflare, Replicate, and other providers. Workers, Durable Objects, Queues, R2, and Vectorize stay where orchestration and storage already live.

None of that is a migration ticket yet. I still treat Replicate as its own product: token in a secret store, versions pinned, cold starts and billing watched. Today the hop for a missing model is often Replicate. Later that catalog might run on Workers AI hardware behind Gateway. I'm waiting on a Worker call that no longer needs a separate vendor token. Until then, my code stays put.
