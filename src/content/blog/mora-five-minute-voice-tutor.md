---
title: Mora, a five-minute voice tutor
description: I rebuilt a CLI voice tutor as a five-minute conversation on Cloudflare, with Flue agents, a cascaded voice gateway, and a focus queue that carries into the next session.
pubDate: 2026-08-02
---

I kept bouncing off language apps that wanted another round of flashcards when what I needed was five awkward minutes of speaking. An earlier Audio Tutor prototype already proved the STT → model → TTS loop worked on a CLI. The React Native client never got there. So I rebuilt the idea as Mora: speak with a live tutor for five minutes, hard stop, then get a debrief and a short focus queue for next time.

Drill apps stay useful. Mora is for the spoken gap they leave.

## Five minutes, enforced

Sessions last five minutes (`SESSION_DURATION_MS`). When the clock expires, the tutor prompt changes: one short sentence that the session is over, then stop. Teaching ends there. The client switches into debrief without follow-up questions or tool calls.

That limit is doing more than keeping me honest. Give a tutor your full history and a giant curriculum and it will ramble. Mora's tutor only gets the learner passport (languages, level, a short summary), the top three active focus items, and the session starter (topic, scenario, or freeform). That is enough to keep a conversation going without turning the model into a syllabus mid-sentence.

## Tutor live, coach after

While you're talking, the live path runs Claude Haiku through Cloudflare Unified Billing. It speaks only in the target language. Native language is a brief rescue, a few words at most, for when communication fully breaks down. Replies stay short enough for speech, because a paragraph of text is a bad spoken turn.

Two tools let the tutor manage its own memory without naming the queue to the learner: `note_struggle` for a recurring difficulty, and `mark_focus_practiced` once the learner has actually worked on one. The learner hears ordinary conversation turns while those tools quietly update what to focus on next.

When the session ends, a separate Coach agent (Claude Sonnet) takes over. It reads the transcript and passport, writes a structured debrief, and mutates a capped focus queue: add, update, or master, twenty items max. Those items feed the next tutor session. Both agents are Flue Durable Object agents with Valibot-validated contracts. I wanted typed session shapes more than a clever prompt pile.

## Cascaded voice

The client opens a WebSocket to `/api/voice`. Audio goes to ElevenLabs Scribe for realtime STT (PCM with VAD commits). Finals that look like filler (`euh…`) get dropped before they ever reach the tutor. The transcript hits the Tutor agent, and the reply comes back as ElevenLabs Flash TTS, with language and voice picked from the passport.

If Scribe fails at start or drops mid-session, a batch STT path takes over. STT and TTS never own the learner model; they only feed and speak for the Flue tutor. When the voice path flakes out, the tutor session still has a coherent shape, because the agent and the audio pipeline are not the same thing.

Each turn emits a Raindrop interaction (`mora.voice_tutor_turn`), so I can check latency and failures in Workshop and replay the tutor side of a turn without re-running TTS. The socket upgrades with a short-lived HMAC ticket minted by `/api/learner/voice-ticket`, which reuses the normal session auth instead of putting a durable cookie in the WebSocket URL.

## Still rough

Mora is a solid work in progress, not a public product. There's no repo to point you at yet. Full voice needs paid ElevenLabs keys. Neon plus Better Auth (Google) is the production-shaped path; local demos run in memory behind an open API that the production boot guard refuses to start for real. Deepgram stubs still sit in the provider code. Starter variety and multi-language depth are MVP-level.

What I am keeping anyway is the hard five-minute stop, the tutor that only sees the passport and three focus items instead of the learner's whole history, and the coach that writes to the queue instead of talking to the learner directly.
