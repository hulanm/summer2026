# summer2026 - landing prototype

This branch contains a slick, minimal landing-page prototype for the Summer Reading Marathon.

Files:
- index.html: standalone landing page
- styles.css: styling
- script.js: local-only JS (stores logs and pledges in localStorage). Pledges are fixed at $0.01/min.

Branch: landing-prototype

How to preview:
- Use GitHub Pages (serve the repo) or just download the files and open index.html in a browser.

Notes:
- Pledges recorded are per-minute pledges fixed at $0.01/min. The prototype records them and estimates payout; it does not process payments.
- I can now add Supabase persistence and Stripe integration if you want.
