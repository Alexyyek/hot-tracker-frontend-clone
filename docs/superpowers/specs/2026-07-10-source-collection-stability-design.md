# Source Collection Stability Design

## Goal

Make AI Hot Tracker's static collector observable and safer by reporting health for every source, avoiding stale fallback content in daily reports, and ensuring GitHub Pages deployment does not duplicate scheduled collection work.

## Scope

This phase implements the first stability layer:

- Generate `public/data/source-health.json` for all configured sources.
- Keep `public/data/weixin-health.json` for WeChat-specific channel detail.
- Exclude manual WeChat seed items and stale cache-only items from daily reports.
- Change the Pages workflow so scheduled data commits trigger deployment without a second full collection pass.

This phase does not add paid APIs, new WeChat feed providers, or X API credentials.

## Source Health Model

Each source health row records:

- `sourceName`, `sourceKind`
- `status`: `fresh`, `partial`, `cache_only`, `seed_only`, `stale`, `empty`
- `itemCount`, `freshCount`, `cacheCount`, `seedCount`
- `latestPublishedAt`, `latestTitle`, `latestAgeHours`
- `parsers`, `channels`
- `recommendedAction`

Status is derived from collected items:

- `fresh`: at least one direct non-cache, non-seed item.
- `partial`: direct items exist but cache or seed is also used.
- `cache_only`: only recent cache items exist.
- `seed_only`: only manual seed items exist.
- `stale`: items exist, but latest effective item is older than the allowed freshness window.
- `empty`: no usable item exists.

## Daily Eligibility

Daily reports should represent real current signals, not source placeholders.

- Exclude `manual_weixin_seed` from daily selection.
- Exclude cache-only items older than 14 days.
- Keep recent cache items as a temporary continuity fallback.
- Feed pages may still show seed/cache items so users can see source coverage, but daily reports should not promote them.

## Workflow Change

`Update Static Data` remains the only scheduled collector. `Deploy GitHub Pages` should build already-committed static JSON and deploy it.

Deployment triggers:

- `workflow_run` after successful `Update Static Data`
- manual `workflow_dispatch`
- source-code pushes

Data-only commits should not trigger a second push-based deployment in parallel with `workflow_run`.

## Verification

- Collector tests assert `source-health.json` exists and covers every source.
- Collector tests assert daily reports do not reference manual WeChat seed items or stale cache items.
- `npm run collect:data` regenerates data successfully.
- `npm run test:collector` passes.
- `BASE_PATH=/ VITE_DATA_MODE=static npm run build` passes.
