# AI Hot Tracker UI High-Fidelity Refresh Design

Date: 2026-07-14

## Goal

Bring the current AI Hot Tracker frontend back to the compact, restrained visual quality of `https://hot.kyangc.net/` while preserving the product name, AI-only information architecture, existing data, and existing interactions.

The selected direction is **A: original-site high fidelity**. Visual hierarchy, density, typography, borders, spacing, and responsive behavior should follow the reference site. Product-specific differences remain limited to the `AI Hot Tracker` brand and the current four AI topic groups.

## Evidence

The design is grounded in fresh captures from 2026-07-14 at matching viewport sizes:

- Desktop feed: `1440 x 1000`.
- Desktop daily: `1440 x 1000`.
- Mobile feed: `390 x 844`.

The comparison found five primary gaps:

1. Feed images dominate the current viewport and reduce information density.
2. Topic, score, source, tags, and controls compete for attention at the same level.
3. Source filters are taller and more fragmented than the reference rows.
4. Daily content is too small and tightly set for comfortable long-form reading.
5. Mobile actions and media consume too much of the first screen and crowd the fixed navigation.

## Scope

### In Scope

- Top bar and primary navigation styling.
- Feed desktop and mobile layouts.
- Topic and source filter presentation.
- Feed card hierarchy, collapsed and expanded states, media treatment, tags, scores, and sharing controls.
- Daily desktop and mobile layouts, typography, date control, report navigation, section numbering, and source references.
- Light and dark theme token alignment.
- Responsive and accessibility polish directly affected by the visual refresh.

### Out of Scope

- Changes to collector behavior, ranking, filtering logic, daily generation, or data schemas.
- Changes to topic names or the AI-focused source catalog.
- New routes, backend services, user accounts, or admin features.
- Replacing Lucide icons or creating new illustrated assets.

## Design Principles

### Reference First

Where the current frontend and reference differ, use the reference site's visible treatment unless it conflicts with the retained AI product structure or an existing required function.

### Dense but Calm

The interface should feel like a professional information monitor. Density comes from smaller spacing and fewer competing decorations, not from shrinking all text.

### One Emphasis Per Layer

- Page level: active primary tab.
- Sidebar level: active topic or source.
- Feed card level: title first, then source and score.
- Daily story level: section title first, then story title and source count.

Decorative gradients, glass effects, strong shadows, and repeated pill treatments should not compete with these states.

## Feed Design

### Desktop Structure

- Keep the existing centered two-column application shell.
- Match the reference site's sidebar-to-content proportion, outer margins, top spacing, and inter-column gap at `1440 x 1000`.
- Use thin neutral borders and very light shadows. Panels should not appear to float far above the page.
- Keep the top bar compact. Retain the `AI Hot Tracker` name, current target icon, dynamic tab, daily tab, and theme control.

### Topic Panel

- Keep the four current AI topics and the aggregate `全部 AI` entry.
- Match the reference row height, internal padding, border weight, active tint, label weight, and count alignment.
- Keep explanatory tooltips available but visually hidden until hover or focus.
- Avoid adding a second visible description line inside each topic row.

### Filter Panel

- Use the reference site's compact label and control spacing.
- Keep keyword, source type, minimum score, and source filtering behavior unchanged.
- Render each source as a single compact row: icon, one-line name, and right-aligned count.
- Truncate long source names with an ellipsis. Expose the full name through the accessible label and title tooltip.
- Remove the always-visible secondary source-kind line from each source row.
- Use one consistent source icon for every item from the same source.

### Feed Header

- Match the reference title scale and header height.
- Keep the refresh action on desktop, but reduce its visual prominence to a secondary utility action.
- Keep the result count visually quiet.
- Do not show a persistent update-status banner when no action is running.

### Feed Cards

- Match the reference card padding, border, radius, title size, body size, line height, and timeline spacing.
- Source identity stays on the left; score stays on the right.
- Remove the visible topic pill from the card header when the current topic context already communicates it. Topic information can remain in the footer when useful.
- Keep titles Chinese where the content rules currently require Chinese, and keep paper titles in English.
- Recommendation text remains in the muted green callout used by the reference.
- Tags remain compact and low contrast.
- Sharing remains in the footer with the existing Lucide icon.

### Media

- Do not render feed images in the collapsed card state on desktop or mobile.
- Render media only after the user expands a card.
- Expanded media uses a bounded width and stable aspect ratio so it cannot stretch the card beyond the readable text column.
- Failed media loads collapse cleanly without leaving a blank framed area.

### Expansion

- Preserve the existing expand/collapse interaction.
- Collapsed summaries use the reference-like readable excerpt length.
- Expanded state reveals the complete summary, recommendation, and media without changing the card's horizontal alignment.

## Mobile Feed Design

- Match the reference mobile header scale and first-screen density at `390 x 844`.
- Replace the separate refresh and filter emphasis with one compact filter entry. Refresh remains available as a secondary action inside the filter surface or through an understated icon action.
- Hide the desktop timeline time rail.
- Keep source, time, and score on one stable header row where space allows; wrap only the title and body.
- Keep collapsed media hidden.
- Reserve bottom padding for the fixed primary navigation so it never covers the card footer, tags, or share action.
- The filter drawer retains all current functions and uses the same compact source rows as desktop.

## Daily Design

### Desktop Structure

- Preserve the two-column daily reader.
- Match the reference sidebar width, date-control height, report-button density, main article border, and top summary treatment.
- Keep the current available reports; do not invent missing report categories to fill the sidebar.

### Typography

- Increase daily article title, body, and story-title sizes to the reference reading scale.
- Use the reference-like serif stack for editorial daily headings and body copy where currently established.
- Increase line height and paragraph spacing so the article reads comfortably without appearing sparse.
- Keep metadata and breadcrumbs in the smaller sans-serif style.

### Sections and Sources

- Match the reference section-number circles, section spacing, story indentation, and divider treatment.
- Keep source counts directly after story titles.
- Source count hover and focus opens the existing linked source popover.
- Popover titles and links truncate safely, retain external-link icons, and remain clickable.

### Date Selection

- Preserve the current date picker and historical report loading.
- Make the visible date control match the reference input styling.
- Ensure the native picker or custom calendar stays within the viewport on desktop and mobile.

## Theme Tokens

- Use the reference light theme as the primary visual baseline: warm off-white page, white content surfaces, neutral beige borders, dark brown text, and restrained amber accents.
- Reduce gradients and backdrop blur to cases where the reference visibly uses a translucent floating control.
- Reduce the default shadow to a subtle separation shadow.
- Preserve dark mode, but map the same hierarchy into dark surfaces rather than introducing additional accent colors.

## Component Boundaries

The refresh should stay within existing ownership boundaries:

- `TopBar`: brand scale, navigation shell, mobile action treatment.
- `FilterPanel`: topic rows, filter controls, source rows, truncation, and icon consistency.
- `FeedPage`: header actions and mobile filter entry.
- `FeedTimeline`: card hierarchy, collapsed media behavior, expansion, and footer.
- `DailyPage`: reader layout, report navigation, article hierarchy, and date control.
- `styles.css`: visual tokens, responsive dimensions, and interaction states.

No new shared component is required unless a small extraction removes duplicated source-row or icon behavior already present in these files.

## Error and Empty States

- Existing loading, error, warning, and empty behavior remains unchanged.
- Restyle these states to use the same border, typography, and spacing hierarchy as the refreshed panels.
- A failed media item must not create an empty block.
- Long Chinese, English, URL-like, and unbroken source names must not overflow their containers.

## Accessibility

- Preserve semantic buttons, links, headings, and tab labels.
- Maintain visible keyboard focus for tabs, filters, source rows, expand controls, sharing actions, date selection, and source-reference popovers.
- Active states must not rely on color alone; retain pressed, selected, border, or icon cues.
- Mobile interactive targets remain at least `40 x 40` CSS pixels even when the visible row becomes denser.
- Recheck text and border contrast in both themes.
- Screenshot review cannot prove screen-reader behavior, so keyboard and semantic checks remain part of acceptance.

## Acceptance Criteria

### Desktop Feed

- At `1440 x 1000`, layout proportions and first-screen information density visibly match the reference.
- The first collapsed item does not display a large image.
- Source rows are single-line and long names truncate.
- Header, timeline, cards, tags, and source scores do not overlap.

### Mobile Feed

- At `390 x 844`, the first viewport shows the feed title and meaningful article content without a large media block.
- The fixed navigation does not cover card actions or content.
- Filter drawer controls fit without horizontal overflow.

### Daily

- At both target viewports, article typography and section rhythm visibly match the reference more closely than the current implementation.
- Date selection, report switching, source hover/focus, and source links still work.
- Daily content has no horizontal overflow.

### Regression Safety

- Topic filtering, source filtering, minimum score, keyword search, refresh, expansion, sharing, theme switching, date selection, and historical daily loading continue to work.
- TypeScript build succeeds.
- Collector tests remain green because no collector behavior changes.

## Verification

1. Run the project build and collector tests.
2. Start the production preview.
3. Capture current implementation and reference at `1440 x 1000` and `390 x 844` in matching states.
4. Compare reference and implementation side by side for feed and daily pages.
5. Check desktop and mobile overflow, long source names, collapsed and expanded cards, filter drawer, dark mode, and daily source popovers.
6. Repeat the screenshot comparison after visible differences are corrected.
