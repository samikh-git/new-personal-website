---
title: A 10-year Hijri .ics by email
description: Mom's birthday is 2 Muharram. Gregorian "repeat yearly" is the wrong yearly, so I built a Worker that converts ten Hijri years and emails one calendar file.
pubDate: 2026-08-02
---

Mom's birthday is 2 Muharram every year. On a Gregorian calendar that drifts, and "repeat yearly" on June 17 is the wrong kind of yearly: it pins a solar date and comes back every twelve months, while a lunar day slides about eleven days earlier each cycle. I got tired of converting by hand and pasting one-off events into Apple Calendar.

So I built [Hijri Reminders](https://www.hijri.cloudwhisper.dev). You pick a Hijri day, month, and year, add a title and an email. The API converts the next ten Hijri years to Gregorian, packs them into one `.ics`, and emails the file. After one import, the anniversaries show up without another round of date math.

## Why "yearly" lies

Phone calendars and Google Calendar are built around Gregorian recurrence. You can fake a Hijri anniversary with a pile of one-off events, and most people do that, then forget to extend the list when the decade runs out.

`RRULE` does not help here. A Gregorian yearly rule pins a solar date. What I needed was ten concrete Gregorian dates for the same Hijri day and month, then a file calendars already know how to import.

Moon sighting is its own mess. Communities that follow a local sighting can land a day off from tabulated calendars. I needed one consistent conversion path, not a debate inside the Worker. The app uses [Umm al-Qura](https://en.wikipedia.org/wiki/Umm_al-Qura_calendar) (`calendarMethod=UAQ`) via the [Aladhan API](https://aladhan.com/). The site footer notes that local sighting may differ by a day.

## Worker plus a small form

The API is a Cloudflare Worker on [Hono](https://hono.dev/). The dashboard is Vite and vanilla TypeScript, no React, at [hijri.cloudwhisper.dev](https://www.hijri.cloudwhisper.dev). Code lives in [samikh-git/hijri-reminders](https://github.com/samikh-git/hijri-reminders). Production API: `hijri-reminder-api.sami-houssaini.workers.dev`.

The request is small:

```json
{
  "email": "you@example.com",
  "title": "Mom's birthday",
  "description": "Optional note",
  "hijriDay": 2,
  "hijriMonth": 1,
  "hijriYear": 1448
}
```

On success the JSON includes the Gregorian date list, so the dashboard can show a preview table after the email goes out. The form pre-fills today's Hijri date from Aladhan `gToH`. If the next Hijri holiday is within three days, a dismissible banner shows (keyed in `localStorage` per holiday date).

## Ten fetches, one VCALENDAR

Each year is an Aladhan `hToG` call. Ten of those run in parallel. Successful responses sit in Cloudflare's `fetch` cache for a year (`cacheEverything` plus a long `cacheTtlByStatus`). Under UAQ a given Hijri date maps to one Gregorian date, so re-fetching on every reminder is wasted work.

The calendar file is one `VCALENDAR` with ten `VEVENT`s. Events are all-day: `DTSTART;VALUE=DATE` and `DTEND;VALUE=DATE` with an exclusive end the next day. A timed UTC start would shift the civil day for anyone outside UTC, so the events stay date-only and keep Apple Calendar and Google on the intended date. Titles include the Hijri date string so the event still makes sense after import, like `Mom's birthday (2 Muharram 1448)`.

Email comes from `reminders@hijri.cloudwhisper.dev` via [Resend](https://resend.com/). The message includes an abuse reference so someone who did not request a reminder can quote it back. On a successful send, the Worker logs client IP with that reference.

## Workers gotchas

I tried `hono-rate-limiter` first. It calls `setInterval` at module load. Cloudflare Workers forbid that, so the Worker dies on import. Rate limiting now uses KV: 50 requests per IP over a week-long fixed window, no timers at the top level. Secrets come from `c.env` inside handlers. Same rule for Resend: do not construct the client in module scope.

CORS is an allowlist for the dashboard origins plus local Vite. The form is public, so the limiter and abuse refs are there because an open email endpoint will get poked.

## Limits

There is no live sync with your calendar account, and no automatic refresh if Umm al-Qura tables change years out. It is a one-shot export: ten dates, one file, email. Want another decade later? Submit again. Try it at [hijri.cloudwhisper.dev](https://www.hijri.cloudwhisper.dev), or dig into the code on [GitHub](https://github.com/samikh-git/hijri-reminders).
