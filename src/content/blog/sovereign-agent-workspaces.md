---
title: Sovereign agent workspaces
description: Notes on sandboxed coding-agent compute where provider keys stay outside the container, on hardware you own.
pubDate: 2026-07-30
---

Coding agents get useful when they have a real shell, a real filesystem, and permission to change things. That same setup is also where things go wrong. Give an agent your org's provider key in its environment and unrestricted egress, and you have a leak waiting for a creative prompt.

I've been building a local stack for the opposite shape: sandboxed, disposable compute over snapshotted storage, on hardware you own, with a policy gateway that holds the real keys. These are notes from that design, not a product launch.

## The split that matters

What I am optimizing for is blast radius. Agents need tools, and organizations need to know what a runaway session can touch. Those are different jobs, and they belong in different processes.

The system breaks into a few roles. The router creates and destroys workspaces, attaches storage, starts sandbox runtimes, and exposes a control API, plus an embedded UI for chat, diffs, and permission prompts. The policy gateway holds provider keys, enforces route allowlists and rate limits, and writes a hash-chained audit ledger; sandboxes never see the real key. The sandbox image runs the agent (OpenCode in the current build) inside a disposable container that talks out only through the gateway. Storage is copy-on-write, so clones and snapshots stay cheap.

Once compute, custody, and disk live in separate processes, a prompt that goes sideways has a lot less to steal.

## Keys stay in the gateway

When a workspace comes up, the router mints a session token and registers it with the gateway. The sandbox presents that token as `x-api-key` / `Bearer`. The gateway swaps it for the real provider credential, enforces which models and paths the session may hit, and appends every request (allowed or blocked) to a ledger.

What a session token buys is deliberately narrow. It covers models on the route's allowlist and inference endpoints only (not account admin, batches, or files), under per-workspace rate limits. Spend is the real risk of a leaked token.

Revocation follows the workspace lifecycle. `down`, destroy, and hibernate unregister the session. Keys live in the gateway process. The router forwards and does not store them.

## Networks that only go one place

For stronger isolation, sandboxes sit on an internal Docker network with no route to the public internet. Their only peer is the gateway. Model traffic has to go through policy, and a compromised agent can't casually `curl` the rest of the world with your credentials.

## Snapshots instead of snowflake disks

Workspaces should be cheap to branch and freeze. In the production-shaped data plane that's ZFS-style snapshotted storage. In local development a `dir` backend uses APFS clonefile / Linux reflinks, so CoW clones are near-instant without standing up the full stack.

Idle hibernate is gated carefully. A workspace only scales to zero when ledger traffic, CPU, and the agent's `/busy` probe all say idle for the whole window. Probe errors count as active: if the probe cannot answer, you do not get to pretend the agent is done. Wrongly killing work is worse than leaving a sandbox warm.

## Guarding the control plane

The router API can create workspaces, read and write files, rotate keys, and open a root shell in a sandbox. A loopback bind is not a security boundary if something forwards to it. The current guards:

- Bearer token required for non-loopback listeners
- Host allowlist (and 421 for everything else) to blunt DNS rebinding
- Origin checks on requests and WebSocket upgrades
- `Content-Type: application/json` on mutating bodies so simple-request CSRF shapes fail closed

The UI keeps the token out of the query string where it can, and treats the API as hostile by default.

## What I'm optimizing for

Cloud agent sandboxes are fine when you want someone else to run the fleet. I want the other end: you own the machine, you own the ledger, and the agent's world is a disposable clone that cannot exfiltrate the master key.

Plenty of rough edges still: packaging, multi-host scheduling, how much of the design docs to open-source. The part I'm committed to is the split itself. Give the agent the compute, keep custody in the gateway, and let snapshots own the disk.
