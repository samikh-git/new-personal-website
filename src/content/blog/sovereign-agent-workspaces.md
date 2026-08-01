---
title: Sovereign agent workspaces
description: Notes from building sandboxed compute for coding agents, with provider keys kept outside the container, on hardware you own.
pubDate: 2026-07-30
---

Coding agents get useful when they have a real shell, a real filesystem, and permission to change things. That same setup is also where things go wrong. An agent with your org's provider key in its environment and unrestricted egress is a leak waiting for a creative prompt.

I've been building a local stack for the opposite shape: sandboxed, disposable compute over snapshotted storage, on hardware you own, with a policy gateway that holds the real keys. These are notes from that design, not a product launch.

## The split that matters

The system has a few clear roles:

- **Router:** creates and destroys workspaces, attaches storage, starts sandbox runtimes, and exposes a control API (plus an embedded UI for chat, diffs, and permission prompts).
- **Policy gateway:** custody for provider keys, route allowlists, rate limits, and a hash-chained audit ledger. Sandboxes never see the real key.
- **Sandbox image:** the agent runtime (OpenCode in the current build) inside a disposable container, talking out only through the gateway.
- **Storage:** copy-on-write workspaces so clones and snapshots are cheap.

Agents need tools. Organizations need blast-radius control. Putting those concerns in different processes is the whole idea.

## Keys stay in the gateway

When a workspace comes up, the router mints a session token and registers it with the gateway. The sandbox presents that token as `x-api-key` / `Bearer`. The gateway swaps it for the real provider credential, enforces which models and paths the session may hit, and appends every request (allowed or blocked) to a ledger.

What a session token buys is deliberately narrow:

- Models on the route's allowlist
- Inference endpoints only (not account admin, batches, or files)
- Per-workspace rate limits (spend is the real risk of a leaked token)

Revocation follows the workspace lifecycle: `down`, destroy, and hibernate unregister the session. Keys live in the gateway process. The router forwards and does not store them.

## Networks that only go one place

For stronger isolation, sandboxes sit on an internal Docker network with no route to the public internet. Their only peer is the gateway. Model traffic has to go through policy, and a compromised agent can't casually `curl` the rest of the world with your credentials.

## Snapshots instead of snowflake disks

Workspaces should be cheap to branch and freeze. In the production-shaped data plane that's ZFS-style snapshotted storage. In local development a `dir` backend uses APFS clonefile / Linux reflinks, so CoW clones are near-instant without standing up the full stack.

Idle hibernate is gated carefully. A workspace only scales to zero when ledger traffic, CPU, and the agent's `/busy` probe all say idle for the whole window. Probe errors count as active. Wrongly killing work is worse than leaving a sandbox warm.

## Guarding the control plane

The router API can create workspaces, read and write files, rotate keys, and open a root shell in a sandbox. A loopback bind is not a security boundary if something forwards to it. The current guards:

- Bearer token required for non-loopback listeners
- Host allowlist (and 421 for everything else) to blunt DNS rebinding
- Origin checks on requests and WebSocket upgrades
- `Content-Type: application/json` on mutating bodies so simple-request CSRF shapes fail closed

The UI keeps the token out of the query string where it can, and treats the API as hostile by default.

## What I'm optimizing for

Cloud agent sandboxes are fine when you want someone else to run the fleet. I want the other end: you own the machine, you own the ledger, and the agent's world is a disposable clone that cannot exfiltrate the master key.

Plenty of rough edges still: packaging, multi-host scheduling, how much of the design docs to open-source. The part I'm committed to is the split itself. Compute for the agent, custody for the gateway, snapshots for the disk.
