---
name: reseed-data
description: Regenerate the static portfolio JSON seed data (holdings, transactions, history, watchlists) for the Stock Playground via the generateData script. Use when the user wants to reset or refresh seed account data.
---

Regenerate the static account seed tables under `src/data/` (holdings.json, transactions.json, stockHistory.json, watchlists.json) by running:

```
npm run gen-data
```

This runs `scripts/generateData.mjs`. It overwrites the JSON seed files in place — this is destructive to any hand-edited seed data, so confirm with the user first if they may have local edits.

After running, report which files changed (`git status src/data/`).
