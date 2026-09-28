# What's new on the site

1. **Real photo gallery** — the emoji placeholders are replaced with your 34
   actual product photos (`images/` folder), each with a caption and a
   translucent diagonal "FRESHLY BAKED" watermark baked into the image
   overlay (CSS, not burned into the file) so a screenshot or right-click
   save still shows your name across it.
2. **Reviews section** — customers pick a star rating and write a review.
   Reviews are public and show on the site (average score + review cards).
3. **Leave Us a Message** — a private contact form. Messages are NOT shown
   publicly; they're stored for you to check.

## Setup: 3 steps

### 1. Upload the images
Copy the whole `images/` folder into your GitHub repo, next to `index.html`.
34 photos, already resized and compressed for the web (~6 MB total).

### 2. Add reviews + messages to your Cloudflare Worker
You already have a Worker for the "Ask About My Work" Q&A widget. Add the
routes in `worker.js` (this file) to that same Worker:

- If you have an existing `worker.js` with Q&A logic, open it and paste the
  three `if (url.pathname === ...)` blocks from this file into your existing
  `fetch()` function, before your Q&A logic's `return`.
- If you don't, you can deploy this file as-is (it will run standalone, and
  you can add the Q&A logic back in later).

Then, in the Cloudflare dashboard:
1. Go to your Worker → **Settings → Variables → KV Namespace Bindings**.
2. Click **Create a namespace**, name it e.g. `bakery-reviews`.
3. Bind it to the Worker with variable name **`REVIEWS_KV`** (must match
   exactly — the code reads `env.REVIEWS_KV`).
4. Deploy the Worker.

### 3. Point the site at your Worker
In `index.html`, near the bottom, find:
```js
const WORKER_URL = "https://REPLACE-WITH-YOUR-WORKER-URL.workers.dev";
```
Replace it with your real Worker URL (the same one your Q&A widget uses).

## Checking your private messages
Messages people send via "Leave Us a Message" are stored in KV under the key
`messages_list`, not shown on the site. To read them: Cloudflare dashboard →
Workers & Pages → KV → your namespace → click `messages_list` → view the
JSON. (A simple admin page to view these nicely is a good next step if you
want one later.)

## Gaps, named honestly
- The "decorated cakes" batch (a teal rose cake, a mermaid/ocean cake, and a
  floral "HBD GIRL" cake) mentioned earlier in this project were never found
  in the uploaded photos, so they're not in the gallery. Re-upload that batch
  if you want them added.
- Reviews and messages have no spam protection (no CAPTCHA, no rate limit).
  Fine for a small local bakery; worth adding if abuse becomes a problem.
- The star-rating average is a simple mean of stored reviews; there's no way
  yet to edit or delete a review from the site itself (only from the
  Cloudflare KV dashboard).
