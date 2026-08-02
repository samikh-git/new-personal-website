---
title: Introducing ReplicateAI
description: An agent that takes an applied-econ PDF and a public CSV, estimates the headline coefficient in a Modal sandbox, and writes a referee-style audit.
pubDate: 2026-08-02
---

Most agent demos succeed by synthesizing prose. Empirical replication is harder in a useful way: the published β does not care how confident the model sounds, and almost every real run fails at least once on a dtype, a missing column, or a bad specification.

I wanted a narrow demo of that loop: paper PDF plus public CSV in, a referee-style audit out, with the debugging visible. That project is **[ReplicateAI](https://github.com/samikh-git/replicate-ai)**. It is a portfolio research tool with curated example packs, not a "replicate any paper" product.

## What a run does

Point the CLI at an example pack (or a folder with `paper.pdf` and `data.csv`):

```bash
cd replicate_ai
uv sync
uv run replicate-ai ../examples/card_krueger

# CI / plain stdout
uv run replicate-ai --no-tui ../examples/card_krueger

# Browser launcher (uv sync --group gui first)
uv run replicate-ai --gui
```

Host-side PDF preflight (Docling by default) writes `paper_text.md` and `paper_tables.json`. Those files, plus the PDF and CSV, go into a Modal `/workspace`. A LangChain Deep Agent acts as econometrician: it locks a `target_specification.json`, writes estimation scripts, runs them in a Python sandbox (`statsmodels`, `linearmodels`, and friends), and edits when the traceback says so. An auditor sub-agent compares the estimate to the published number and writes `replication_audit.md` with MATCH, CLOSE, MISMATCH, or FAILED.

On a TTY you get a Textual dashboard with phases, a live log, and a headline card. `--gui` opens a browser launcher. `--no-tui` is the path for CI.

## Why this shape

Wrong code is expected, logs are long, and success is a number you can check. Deep Agents already has the harness pieces that make that tractable: planning that survives context flushes, a virtual filesystem that spills fat stdout, and sub-agents with their own windows. PDF extraction stays on the host so the sandbox image stays lean. Econometrics stays in Modal so a broken script cannot trash the laptop.

The auditor is strict on purpose. MATCH means same sign, relative deviation within 5%, and the same significance bucket. That is closer to how a referee reads a table than how a chatbot grades itself.

## What has matched so far

Six packs under `examples/`: Card & Krueger, Dehejia-Wahba, Imbens-Rubin-Sacerdote, Angrist-Lavy, Autor-Dorn-Hanson, and Acemoglu-Johnson-Robinson. Public data only. One headline estimand per run.

Documented Anthropic runs in `docs/test.md`:

| Pack | Verdict | Notes |
|------|---------|-------|
| Card & Krueger | MATCH | One run hit 2000-reply coeffs, not 1994 Table 3 |
| Dehejia-Wahba (NSW experimental) | MATCH | Headline treat → RE78 |
| Imbens lottery | MATCH | Prize-on-earnings elasticity, ~4% rel. dev. |
| Autor-Dorn-Hanson | MATCH | Import exposure → mfg share |
| Angrist-Lavy | CLOSE | Class-size IV, ~7% off |
| AJR | (empty) | Still unfilled |

The MATCH count is less interesting than the failure modes. Imbens had an earlier run that MATCH'd a different table than the pack documents: numerically tight on the coefficient the agent chose, wrong for the pack target. Wrong-estimand MATCH is real. That is why the roadmap starts with a `BENCHMARK.md` (pack × provider × verdict × failure tag) instead of more papers.

## Limits

Python only in the sandbox. No Stata or R path. No credentialed microdata. No full-table replication. Not production hosting. The README says this out loud because the claim worth making is autonomy on a narrow, checkable task, not coverage of the AER archive.

If you want to try it, start with Card & Krueger (PDF and data ship in-repo), then work through the other packs in [examples/](https://github.com/samikh-git/replicate-ai/tree/main/examples). Issues and design notes live in the repo.
