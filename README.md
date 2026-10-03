# Find Your Crystal — Mooncat Crystals Quiz

Static quiz styled to match mooncatcrystals.com. Deterministic scoring (no AI) across 13 crystals — 6 questions total (4 scored, 2 metadata-only) — results link to live Shopify collections (not individual products, so they always reflect current stock) plus up to 4 real in-stock product cards. Email is **not required to see the result** — the result and shop links show immediately after the last question; email capture is a separate, optional ask on the result screen itself.

## Flow (result-first, not gated)
Quiz questions → result screen shows immediately (crystal match, live products, "Shop →" button) → *optionally*, a small "email me this result" form on that same screen for people who want it saved/sent, which is the only thing that triggers Flodesk tagging. Getting people shopping is the priority; the email list is a bonus for whoever opts in on their own. If you ever want to go back to gating the result behind email, the relevant logic is `finishQuiz()` (reveals the result) vs. the `save-form` submit handler (Flodesk tagging) in `index.html` — they're now fully decoupled on purpose.

## Scoring design
Every crystal has at least one **exclusive** high-point option (not shared with its theme-mates) in Question 4 ("If you're honest, what do you need most right now?") — that's what actually separates, say, Citrine from Pyrite from Tiger's Eye, which would otherwise tie constantly since they share the same broad "confidence/abundance" options in Q1 and Q3. Q1 and Q3 are deliberately broad/atmospheric; Q4 is the disambiguator. If you add a crystal later, give it an exclusive Q4 option or it'll get out-voted by its theme-mates.

The two metadata questions (how you want to use it, experience level) don't affect which crystal you get — "how you want to use it" instead re-sorts the matched crystal's real in-stock products (a ring first for "wear it", a tower first for "keep it in my space") via keyword matching in `crystal-products.js`, so the *specific piece* recommended is sharper too, not just the crystal type.

## Files
- `index.html` — the whole quiz (branding, questions, scoring, results, optional email opt-in)
- `functions/api/quiz-submit.js` (served at `/api/quiz-submit`) — server-side call to Flodesk (keeps the API key private)
- `functions/api/crystal-products.js` (served at `/api/crystal-products`) — looks up real in-stock products for the matched crystal's collection via the Shopify Storefront API, so the result screen shows live product cards (photo, price) instead of just a link. Uses the **same `SHOPIFY_STOREFRONT_TOKEN`** as `crystal-skool-dashboard/netlify/functions/shop-products.js` — reuse that value here rather than creating a new token. If the lookup fails or the token isn't set yet, it fails open and the result screen just shows the plain "Shop [Crystal] →" collection link instead.

## Segmentation strategy
Subscribers are tagged at the **theme** level (6 groups covering the 13 crystals), not one segment per crystal — 6 nurture sequences are maintainable, 13 isn't. The exact crystal match is stored as a Flodesk **custom field** instead, so you can still personalize each theme's emails with merge tags (e.g. "since you matched with {{Crystal Match}}...").

## One-time setup
See the full walkthrough from Claude. Short version:
1. In Flodesk, create 6 static segments (Audience → Segments → New Segment, no rules needed):
   `Quiz: Self-Love & Heart`, `Quiz: Calm & Clarity`, `Quiz: Confidence & Abundance`, `Quiz: Protection & Boundaries`, `Quiz: Motivation & Action`, `Quiz: Intuition & Transformation`
2. In Flodesk, create 3 custom fields (Audience → Settings → Custom Fields): `Crystal Match`, `Crystal Theme`, `Crystal Experience Level`.
3. Get a Flodesk API key (Settings → Integrations → API Keys).
4. In Cloudflare → Workers & Pages → this project → Settings → Variables and Secrets, add (as encrypted secrets) `FLODESK_API_KEY` plus one `FLODESK_SEGMENT_*` per theme (exact names are listed at the top of `quiz-submit.js`), and `SHOPIFY_STOREFRONT_TOKEN` (same value as the Crystal Skool Dashboard site's env var of the same name).
5. Hosted on Cloudflare Pages (not Netlify, so it never uses Netlify deploy credits). The project is connected to the GitHub repo with no build command and `/` as the output folder; Cloudflare picks up the `functions/` folder automatically. Every push to `main` redeploys.
6. Update the "Take Our Crystal Quiz" link on mooncatcrystals.com (currently pointing at the old Canva quiz) to the new URL.
7. Link the deployed URL from Instagram bio, email signature, etc.

## Changing crystals or questions later
Edit the `CRYSTALS` and `QUESTIONS` objects in `index.html` — everything is in one file, no build step required. If adding a crystal, check whether a matching Shopify collection already exists before creating a new one.
