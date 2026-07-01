# Hot Tracker Frontend Clone Design

## Goal

Build a frontend-only clone of `https://hot.kyangc.net/` that closely matches the current Hot Tracker experience while using our own implementation. The app should run locally and read the original site's public API through the Vite development server.

## Scope

In scope:

- React + Vite single-page application.
- Desktop layout with a top bar, left filter rail, and right content panel.
- Mobile layout with compact top bar, bottom segmented tabs, and a filter drawer.
- `实时动态` view with topic, source, importance, and keyword filtering.
- `每日日报` view with latest daily reports grouped by topic and section.
- Light and dark theme toggle.
- Loading, error, empty, and "load more" states.
- External source links for feed items.

Out of scope:

- Backend database or crawler.
- Feed ingestion, topic scoring, or daily report generation.
- User accounts, authentication, or admin tools.
- PWA offline caching and update prompts.
- Share poster generation and dedicated share pages.

## Data Sources

The frontend will call the original public API paths through a Vite proxy:

- `/api/topics`
- `/api/feed`
- `/api/feed/sources`
- `/api/feed/topic-counts`
- `/api/daily/latest`
- `/api/daily`

The app will normalize API responses in a small client layer so UI components do not depend on fetch details. Query state will map to the source API's existing parameters, including `topicId`, `sourceKind`, `sourceName`, `sourceHostname`, `minImportance`, `limit`, `cursor`, `raw`, and `total`.

## Information Architecture

The app has two primary tabs:

- `实时动态`: The default view. It shows a filterable feed timeline.
- `每日日报`: A daily briefing view. It shows report cards for each enabled topic.

The top bar contains the brand mark, title, primary tabs, and theme toggle. On desktop, filters stay in a left rail. On mobile, filters open in a bottom sheet from a filter button in the feed header.

## Components

- `App`: Owns theme, active tab, initial data loading, and high-level layout.
- `apiClient`: Fetches topics, feed items, source facets, topic counts, and daily reports.
- `TopBar`: Brand, primary tab switcher, theme toggle.
- `FeedPage`: Coordinates feed query state and renders filters plus timeline.
- `FilterPanel`: Topic list, keyword search, source kind chips, source list, and minimum score control.
- `FeedTimeline`: Groups feed items by date and renders item cards.
- `FeedCard`: Renders source metadata, score, title, summary, tags, why-it-matters text, and external link.
- `DailyPage`: Fetches and renders latest daily reports and date selection.
- `DailyReportCard`: Renders one topic's daily report, watch items, and grouped sections.
- `StatusViews`: Shared loading, error, empty, and inline warning states.

## Visual Design

The clone should echo the original site's warm editorial tool feel:

- Warm off-white background in light mode.
- Dark brown/charcoal background in dark mode.
- Amber brand accent, with per-topic accent colors from the API when available.
- IBM Plex-style sans-serif fallback stack and readable Chinese system fonts.
- Dense but calm operational layout, not a marketing landing page.
- Cards and panels use restrained borders, subtle shadows, and border radii of 8px or less except circular controls.

## Behavior

On startup, the app loads topics and the first feed page. It also loads daily report data opportunistically so the daily tab opens quickly.

Changing filters resets pagination and fetches a fresh feed page. Loading more uses the API `nextCursor`. If a request fails, the current content remains where possible and an inline warning explains the failure.

Theme selection is stored in `localStorage`. The app supports `light`, `dark`, and `system` modes with a persisted choice.

## Error Handling

- Network failures show a non-blocking warning if existing data is available.
- Initial load failures show an error state with a retry button.
- Empty results show a clear empty state and a reset-filters action.
- Daily report failures are isolated from the feed view.

## Testing And Verification

Implementation should be verified with:

- Package install/build smoke test.
- Local development server launch.
- Browser check of desktop and mobile viewports.
- Manual checks for feed loading, filters, tab switching, theme switching, daily view, and load more.
