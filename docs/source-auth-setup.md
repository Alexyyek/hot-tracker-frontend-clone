# Source Authorization Setup

This project reads source credentials only from environment variables or GitHub
Secrets. Do not commit tokens, passwords, cookies, or private RSSHub routes.

## GitHub Secrets

Set these under GitHub repository settings:

- `X_BEARER_TOKEN`: Optional X API bearer token. Used by the direct X API collector.
- `RSSHUB_BASE_URL`: Optional single RSSHub base URL, for example `https://rsshub.example.com`.
- `RSSHUB_BASE_URLS`: Optional comma- or newline-separated RSSHub base URLs. This takes precedence when multiple RSSHub instances are available.
- `WEIXIN_FEED_SOURCES_JSON`: Optional direct RSS/Atom feeds keyed by source name.
- `WEIXIN_RSSHUB_SOURCES_JSON`: Optional RSSHub routes keyed by source name.

## X Collection

The collector tries channels in this order:

1. X API via `X_BEARER_TOKEN`.
2. RSSHub fallback via `RSSHUB_BASE_URL(S)` and `/twitter/user/:handle`.
3. Recent cache fallback only when at least one live X channel is configured.

RSSHub itself needs its own X authorization. The recommended RSSHub auth method
is `TWITTER_AUTH_TOKEN`; RSSHub also supports X developer API credentials.

## WeChat Collection

The collector tries channels in this order:

1. Direct feeds from `WEIXIN_FEED_SOURCES_JSON`.
2. RSSHub feeds from `WEIXIN_RSSHUB_SOURCES_JSON`.
3. Bing discovery.
4. Sogou discovery.
5. Recent cache.
6. Manual source seed.

`WEIXIN_FEED_SOURCES_JSON` accepts full URLs:

```json
{
  "公众号：PaperWeekly": [
    "https://example.com/paperweekly.xml"
  ]
}
```

`WEIXIN_RSSHUB_SOURCES_JSON` accepts either full URLs or routes relative to each
configured RSSHub base URL:

```json
{
  "公众号：PaperWeekly": {
    "routes": [
      "/wechat/wechat2rss/replace-with-feed-id",
      "/freewechat/profile/replace-with-biz-id"
    ]
  },
  "公众号：微软亚洲研究院": [
    "/wechat/wechat2rss/replace-with-feed-id"
  ]
}
```

Useful RSSHub route families for WeChat include:

- `/wechat/wechat2rss/:id`
- `/wechat/feeddd/:id`
- `/freewechat/profile/:id`
- `/wechat/mp/homepage/:biz/:hid/:cid?`
- `/wechat/mp/msgalbum/:biz/:aid`

Each route requires a public feed id, WeChat biz id, homepage id, or album id.
Those ids are not account passwords, but some are still operational details, so
keep them in GitHub Secrets rather than source code.
