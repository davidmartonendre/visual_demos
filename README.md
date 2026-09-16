# 🌾 Harvest Hero

A cosy isometric farm tycoon that runs in one HTML file.

You've inherited your gran's farm in **Hollowbrook**, a valley that went quiet when
the old mill stopped turning. Sweep the wheat, restart the mill, put the ovens back
to work, and the village comes back with it — told in eleven short chapters as you
rebuild, from Gran's letter to the Harvest Festival.

## Play it

Open `index.html` in a browser. That's it — no build step, no dependencies, no server.

```
git clone <this repo> && open index.html
```

Works on desktop and phones.

## Controls

| | |
|---|---|
| **Touch** | Drag anywhere — a virtual stick appears under your thumb |
| **Keyboard** | `WASD` or arrow keys |

Harvesting, hauling, buying and selling are all automatic — you only steer. Walk into
things to make them happen.

## The valley

Everything starts as a wheat field and a market. Each upgrade pad you pay off opens
another piece of the chain:

```
                     ┌─ WINDMILL ──── flour ─┐
  wheat field ───────┼─ CHICKEN COOP ─ eggs ─┴─ BAKERY ─── pies
       │             │
       │             └─ DAIRY BARN ─── milk ─── CHEESE CELLAR ─ cheese
       │
  orchard ─────────── apples ───────── JAM KITCHEN ─────────── jam
```

Eight goods, six workshops, and prices that climb steeply the further along a chain
you go — wheat is $3, a pie is $46, cheese is $52.

## Who buys it

Three buyers, each wanting something different from you:

- **The market** takes anything, any quantity, at list price. The reliable one.
- **The farm stand** on the village road: villagers queue up with an order bubble and
  pay **70% over market** — but only for what they're actually asking for.
- **The town order board** north of the market posts two bundles at a time
  (*"6 milk + 8 apples"*) and pays **2.3×** for filling one. Orders re-roll as your
  farm learns to make better things.

Serving people is the one job your farmhands never do for you.

## Upgrades

Thirteen pads along the village street. Stand on one and your coins pour in until
it's paid off.

- **Backpack** — cheap to climb, 20 levels, 12 → **1,012** items carried
- **Scythe** — roughly doubles in price per level; widens the swathe you cut
- **Boots**, **Fertilizer** — move speed and regrowth
- **Farmhands** — up to 6; they work the wheat field and feed whichever workshop is
  emptiest, falling back to selling when everything is full
- **Artisans** — every workshop makes more per batch, up to 8 at a time
- Plus the six buildings and the orchard themselves

Your farm saves to `localStorage` automatically. 📖 opens the journal, ↺ wipes it.

## Hosting it

The whole game is one static file that makes **no network requests at all** — no CDN,
no fonts, no analytics, no backend. Serving it is just serving `index.html`, so any
static host will do, on a free tier.

**Azure Static Web Apps.** In the portal, create a Static Web App and point it at this
repo. When it asks for build details, choose **Custom** and set:

| Setting | Value |
|---|---|
| App location | `/` |
| Api location | *(empty)* |
| Output location | *(empty)* |

There is nothing to build, so leave the build command empty too. Azure commits its own
GitHub Actions workflow to the repo and wires up the deployment token; every push to the
branch then redeploys. `staticwebapp.config.json` in the repo root sets `Cache-Control:
no-cache` so players always get the current build rather than a stale cached one, and
rewrites unknown paths to the game.

Prefer the CLI? `npm i -g @azure/static-web-apps-cli`, then:

```
swa deploy . --app-name <your-app> --env production
```

**Anything else works too**, since it is one file:

- **GitHub Pages** — Settings → Pages → deploy from branch, root folder. Zero config.
- **Netlify / Cloudflare Pages** — drag the folder in, or link the repo; no build command.
- **Your own server** — `cp index.html` into any web root. It also runs straight off
  disk by double-clicking, though saving works more reliably over `http(s)` than
  `file://`.

One hosting note: progress is stored in the browser's `localStorage`, which is per
origin and per device. Players keep their farm on that domain and browser, but it does
not follow them to another machine.

## Notes

- Villagers and order boards only ask for goods you can currently produce, so there
  are never impossible requests.
- Everything is drawn procedurally on a 2D canvas in an isometric projection —
  no image files, no sprite sheets, no fonts to download.
- Buildings, upgrades, prices, crops and the economy are data-driven: see `STATIONS`,
  `PADS`, `ITEMS`, `PATCHES`, `STAND` and `BOARD` at the top of the script.
