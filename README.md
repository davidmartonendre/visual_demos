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

Your farm saves to `localStorage` automatically every few seconds. The bottom-left
buttons are 🔊 sound, 📖 the journal, 💾 the save file and ↺ wipe-and-restart.

### Save files

💾 opens your whole farm as a file you can **download**, or **copy** as text. Load one
back with **LOAD FILE** or by pasting it in — which is how you move a farm to another
browser, another device, or back after clearing site data.

The file is deliberately not hand-editable. The contents are scrambled and carry a
checksum, so changing a character makes the game refuse the file rather than load it:

```json
{"game":"harvest-hero","format":3,"d":"IT4ZUt8ItvIDJ4J6AcApaFNb1x/76g1t…","s":"k2p9x1"}
```

Behind that, every imported save is also passed through a sanitiser that throws away
anything the game could not itself have produced: upgrade levels are clamped to their
real maximums, farmhands are derived from the pad you bought rather than trusted,
order payouts are recomputed from the goods rather than read, unknown story chapters
are dropped, and coins are capped at lifetime earnings plus the starting purse — an
exact bound, since every coin earned is added to the lifetime total and upgrades are
the only thing to spend on.

**What this is not.** It is tamper *evidence*, not security. Everything needed to
forge a checksum is in `index.html`, and anyone who opens the browser console can set
their coins directly. No purely client-side game can prevent that; only a server that
owns the state can. This stops casual editing of the file, which is the realistic case.

If a stored save ever fails those checks, the game keeps the rejected data under a
separate key instead of overwriting it, and says so rather than silently starting over.

## Notes

- Villagers and order boards only ask for goods you can currently produce, so there
  are never impossible requests.
- Everything is drawn procedurally on a 2D canvas in an isometric projection —
  no image files, no sprite sheets, no fonts to download.
- Buildings, upgrades, prices, crops and the economy are data-driven: see `STATIONS`,
  `PADS`, `ITEMS`, `PATCHES`, `STAND` and `BOARD` at the top of the script.
