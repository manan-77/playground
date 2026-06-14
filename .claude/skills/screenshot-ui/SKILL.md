---
name: screenshot-ui
description: Launch the Stock Playground frontend and screenshot a page to confirm a UI change looks right. Use after editing components/pages/CSS to visually verify the result.
---

Capture a screenshot of a running page to verify a UI change. This is the project-specific shortcut; the bundled `/run` and `/verify` skills are more general and still available.

## Steps

1. Make sure the frontend is up at http://localhost:5173 (start it with `npm run dev` in the background if not — see the `dev-up` skill).
2. Pick the page from the change or the user's request:
   - Home / portfolio: `/`
   - Stock detail: `/stock/<TICKER>` (e.g. `/stock/AAPL`)
   - Trade: `/trade/<TICKER>`
   - Transactions: `/transactions`
   - Profile: `/profile`
3. Take a screenshot with headless Chrome:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --window-size=1440,900 \
  --screenshot=/tmp/playground-ui.png \
  "http://localhost:5173/<path>"
```

4. Read the resulting image and report whether the change renders as expected. Note that live quotes need Yahoo Finance reachable; a blank price area usually means the data fetch failed, not a layout bug.
