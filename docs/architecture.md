# How Harvest Hero is built

This is the map you want open when you change something. It is written for
someone who can read code but has never worked on a game before.

Everything is `index.html` — 2,855 lines: CSS, markup and one long script. Nothing
is imported, nothing is bundled, there is no framework. That was the right call to
get a game working; the cost is that the whole program shares one scope, so any
name is reachable from anywhere and a rename can break something 1,500 lines away
in silence. `docs/engine-options.md` is about what to do with that. This file is
about living with it today.

## The shape of the file

| Lines | What | Change it when |
|---|---|---|
| 9–154 | CSS for the HUD, modals, banners | anything on top of the canvas looks wrong |
| 156–196 | markup: the canvas plus the HUD overlay | you add a button or a panel |
| 199–220 | maths helpers, `iso()`, `fmt()` | almost never |
| 221–367 | **the world tables** — `ITEMS`, `PATCHES`, `STATIONS`, `STALL`, `STAND`, `BOARD`, `COSMETICS`, `PADS` | most gameplay changes |
| 368–421 | game state: `resetGame()`, `newActor()`, the balance formulas | tuning |
| 422–569 | villagers, the queue, the farm stand, the stall keeper | anything about buyers |
| 570–800 | saving: `saveData`, `applySave`, `sanitiseSave`, the file envelope | a new field has to survive a reload |
| 801–864 | sound and input | controls |
| 865–1570 | **the simulation** — harvesting, stations, pads, farmhand AI, story, orders, party, `update()` | behaviour |
| 1571–2561 | **the rendering** — ground, crops, trees, buildings, items, people, `draw()` | how it looks |
| 2562–2855 | HUD sync, modals, `init()`, the frame loop | menus and screens |

Two functions matter more than the rest:

- **`update(dt)`** (1507) runs the world forward by `dt` seconds. It never draws.
- **`draw()`** (2472) paints the current state. It never changes anything.

That split is the single most important convention in the file. Keep it. It is why
the test suite can simulate ten minutes of farming in 40 milliseconds — it calls
`update()` in a loop and never waits for a frame.

## The data tables are the game

The valley is described, not coded. A workshop is one entry in `STATIONS` and one
in `PADS` with a matching `id`; `buyPad()` unlocks it by name with no other change.

```js
{ id:'bakery', name:'BAKERY', x:14.0, y:16.0, w:3.2, h:2.8, shape:'house',
  recipes:[ {in:{cherry:3, flour:2}, out:{cherrypie:1}, time:2.2},
            {in:{flour:2, egg:2},    out:{pie:1},       time:2.0} ],
  ... }
```

Recipes are tried in order, so the cherry version wins whenever there are cherries.
This is why the cherry grove upgrades the bakery without any code knowing about
cherries specifically.

The same is true of `ITEMS` + `ITEM_ORDER` (every good), `PATCHES` (every crop),
`PADS` (every upgrade), `RANKS` (every title), `STORY` (every chapter) and
`COSMETICS`. **Prefer adding a row to writing a function.**

## Recipes

### Change a price, a cost or a rate
Prices live in `ITEMS` (229). Upgrade costs are `cost` × `mul` per level in `PADS`
(332) — `padCost()` does the maths. Everything else is a one-line formula at
371–380: carry capacity, harvest speed, yield, regrowth, walk speed. Change a
number, reload, play. Then run the tests.

### Add a good
1. Add its id to `ITEM_ORDER` (228) and a row to `ITEMS` (229) with `label`,
   `price` and `pill`.
2. Give it a case in `drawItem()` (2027) so it can be drawn in a hand, on a tray
   and on the stall.
3. Make something produce it: a recipe in `STATIONS`, or a `PATCHES` entry.

Never write `{wheat:0, egg:0}` anywhere — call `emptyBag()`. Never write a list of
goods anywhere — loop `ITEM_ORDER` or `availableItems()`. Four places once listed
only wheat/egg/pie, and the market's fell through to `'wheat'` for anything it did
not recognise, which paid wheat prices for cheese and drove the wheat count
negative. `tests/specs/01-data.js` exists to catch exactly that.

### Add a building
1. A `STATIONS` row: position, size, `shape` (`house`, `shed` or `mill`), and its
   `recipes`. Trays are generated from its rectangle.
2. A `PADS` row with the **same `id`**, a cost and a `show()` predicate saying when
   it appears on the street.
3. Nothing else. `buyPad()`, the farmhand AI, the HUD and the save all pick it up.

### Add an upgrade
A `PADS` row plus wherever the number is read. If it should raise a cap, put it in
the formula block at 371–380 rather than scattering `G.up.whatever` through the
simulation.

## The traps

These are all bugs that actually happened here.

- **Anything with a cap needs a reservation counter.** Items fly to a tray over a
  couple of seconds and only land in the flyer's callback. A loop that checks the
  stored amount is reading a number that is seconds out of date, and unloads past
  the cap. Trays use `s.pend`; the stall uses `stockPend`. Neither is saved —
  nothing is in flight across a reload.
- **Size a parcel from a constant, never from what is left.** `flowStep()` takes
  capacity or tray cap. Halving the remainder each time decays geometrically and
  the last few items never arrive.
- **Depth sorting is `x + y`.** Anything tall occludes whatever has a smaller
  `x + y`, which is why the buildings sit west/far and the player's yard east/near.
  Moving a building east makes it draw over things it should be behind.
- **Farmhands can only put down what `deliveryTarget()` can place.** Give one a
  good with nowhere to go and it shuffles between input trays forever. There is a
  10-second watchdog that re-routes to the market, because this shipped once.
- **Idle behaviour has to look deliberate.** Lazy farmhands nap lying down with
  z's. The same pause without the animation reads as the bug above, and was
  reported as one.
- **`sanitiseSave()` must not depend on the balance.** Clamp against things that
  follow from the mechanics — an upgrade's `max`, coins ≤ lifetime earned. Never
  against the cost table: prices get retuned, and a farm played on the old numbers
  would fail the check and be thrown away. That was written once and removed.

## Working on it

```sh
open index.html          # play it
node tests/run.js        # 431 checks, ~7 seconds
node tests/run.js ranks  # just the specs whose name matches
```

Run the tests before you push. Most checks exist because the thing they check was
broken once, and the comment above such a check says which bug. Read that comment
before deciding a failure is the test's fault.

The tests reach into the game by global name — `G`, `actors`, `STATIONS`,
`update`, `syncHUD`. That is the price of one shared scope, and the reason a
rename can break a test with a bare `is not defined`.

## Vocabulary

| In the code | Means |
|---|---|
| `G` | the whole save-able game state: coins, earned, upgrades, stock, story |
| `actors[0]` | you. `actors[1..]` are farmhands |
| `a.carry` | a bag: every good mapped to a number, built by `emptyBag()` |
| `s.bin` / `s.out` | a workshop's input and output trays |
| `pad` | a square on the street you stand on to buy an upgrade |
| `dt` | seconds since the last frame, always passed down, never assumed |
| `iso(x, y)` | tile coordinates → screen pixels |
| tile | one world unit. The map is 40 × 56 tiles |
