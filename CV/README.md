# Cabbibo CV — `cabbibo.github.io/CV`

One-page portfolio site for Isaac Cohen / Cabbibo. Plain HTML/CSS/JS — no build step, no dependencies.

## Files

- `index.html` — page structure (hero, about, work, press, contact)
- `style.css` — all styling
- `script.js` — content data + render logic
- `README.md` — this file

## Adding a new work entry

Open `script.js`. Find the `CATEGORIES` array near the top — each category is an object with `name`, `meta`, and `items`. Add a new object to the right `items` array:

```js
{
  title: "My New Piece",
  thumb: "../img/sites/foo.png",   // optional — local file or full URL
  collab: "Some Collaborator",     // optional
  year: "2026",                     // optional
  desc: "One-line description.",    // optional
  links: [                          // optional — omit for text-only entry
    { label: "Site", url: "https://example.com" },
    { label: "YouTube", url: "https://youtube.com/..." }
  ]
}
```

Rules:
- A single-link entry: the title itself becomes the link.
- A multi-link entry: title is plain text; links render as chips beneath.
- No `links`: entry renders as text-only (greyed) — useful for things you want documented but haven't posted online.

## Thumbnails

Each work item shows a small thumbnail. Resolution priority:
1. Explicit `thumb` field (local path or absolute URL) — wins if set.
2. **Auto-derived** from the first link that matches a known platform: YouTube, Steam, GitHub, Vimeo.
3. **Gradient fallback** with a unique hue keyed off the title.

Local screenshots live in:
- `../img/sites/*.png` — the existing manually-curated set in the parent repo.
- `assets/*.png` — the auto-screenshots taken via headless Chrome (regenerable; see below).

To re-shoot screenshots of your own pages:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --window-size=1280,720 --use-gl=angle --use-angle=metal \
  --enable-webgl --hide-scrollbars --virtual-time-budget=20000 \
  --run-all-compositor-stages-before-draw \
  --screenshot=assets/foo.png "https://cabbi.bo/foo/"
```

Interactive pieces that require a click to start (most BIB PIT / DJ tools) won't capture cleanly — for those, screenshot manually and drop into `assets/`.

## Adding press

Edit the `PRESS` array in `script.js` — same pattern: `outlet`, `title`, `links[]`.

## Adding a contact handle

Edit `CONTACT_LINKS` in `script.js` — `{ label, url }`.

## Deploying

This is already inside the `cabbibo.github.io` repo, so it deploys to GitHub Pages automatically at:

> https://cabbibo.github.io/CV/

To push:

```bash
cd /Users/isaaccohen/cabbibo.github.io
git add CV
git commit -m "Add CV site"
git push
```

## Running locally

Any static server. From this directory:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just double-click `index.html` — it works as a file too.

## Notes

- Mobile-responsive down to 360px.
- Respects `prefers-reduced-motion` — all animation is paused if the user has reduced-motion enabled.
- No tracking, no analytics, no external JS dependencies.
- All external links open in a new tab.
