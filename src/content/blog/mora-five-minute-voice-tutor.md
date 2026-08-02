---
title: Mora, a five-minute voice tutor
description: A conversation-first language tutor on Cloudflare, with Flue agents, a cascaded voice gateway, and a focus queue that carries into the next session.
pubDate: 2026-08-02
---

I kept bouncing off language apps that wanted flashcard drills when what I needed was five awkward minutes of speaking. An earlier Audio Tutor prototype already proved the STT → model → TTS loop worked on a CLI. The React Native client never got there. So I rebuilt the idea as **Mora**: speak with a live tutor for five minutes, hard stop, then get a debrief and a short focus queue for next time.

Drill apps stay useful. Mora is for the spoken gap they leave.

## Five minutes, enforced

Sessions last five minutes (`SESSION_DURATION_MS`). When the clock expires, the tutor prompt changes: one short sentence that the session is over, then stop. No more teaching, no follow-up questions, no tool calls. The client switches into debrief.

That limit shapes the context budget. A tutor that can see your full history and a giant curriculum will ramble. Mora's tutor only gets the learner passport (languages, level, a short summary), the top three active focus items, and the session starter (topic, scenario, or freeform). Enough to keep a conversation going without turning the model into a syllabus.

## Tutor live, coach after

The live path runs Claude Haiku through Cloudflare Unified Billing. It speaks only in the target language; native language is a brief rescue, a few words at most, for when communication fully breaks down. Replies stay short enough for speech. Two tools let the tutor manage its own memory without naming the queue to the learner: `note_struggle` for a recurring difficulty, `mark_focus_practiced` once the learner has actually worked on one.

When the session ends, a separate Coach agent (Claude Sonnet) reads the transcript and passport, writes a structured debrief, and mutates a capped focus queue: add, update, or master, twenty items max. Those items feed the next tutor session. Both agents are Flue Durable Object agents with Valibot-validated contracts. I wanted typed session shapes more than a clever prompt pile.

## Cascaded voice

The client opens a WebSocket to `/api/voice`. Audio goes to ElevenLabs Scribe for realtime STT (PCM with VAD commits). Finals that look like filler (`euh…`) get dropped before they ever reach the tutor. The transcript hits the Tutor agent, and the reply comes back as ElevenLabs Flash TTS, with language and voice picked from the passport.

If Scribe fails at start or drops mid-session, a batch STT path takes over. STT and TTS never own the learner model; they only feed and speak for the Flue tutor. Each turn emits a Raindrop interaction (`mora.voice_tutor_turn`), so I can check latency and failures in Workshop and replay the tutor side of a turn without re-running TTS.

The socket upgrades with a short-lived HMAC ticket minted by `/api/learner/voice-ticket`, which reuses the normal session auth instead of putting a durable cookie in the WebSocket URL.

## Still rough

Mora is a solid work in progress, not a public product; there's no repo to point you at yet. Full voice needs paid ElevenLabs keys. Neon plus Better Auth (Google) is the production-shaped path; local demos run in memory behind an open API that the production boot guard refuses to start for real. Deepgram stubs still sit in the provider code. Starter variety and multi-language depth are MVP-level.

What's staying: five minutes with a hard stop, a tutor that only sees the passport and three focus items instead of the learner's whole history, and a coach that writes to the queue instead of talking to the learner directly.
