# How Harvest Hero is built

This is the map you want open when you change something. It is written for
someone who can read code but has never worked on a game before.

Everything is `index.html` — about 3,080 lines: CSS, markup and one long script. Nothing
is imported, nothing is bundled, there is no framework. That was the right call to
get a game working; the cost is that the whole program shares one scope, so any
name is reachable from anywhere and a rename can break something 1,500 lines away
in silence. `docs/engine-options.md` is about what to do with that. This file is
about living with it today.

## The shape of the file

| Lines | What | Change it when |
|---|---|---|
| 9–178 | CSS for the HUD, the bag panel, modals, banners | anything on top of the canvas looks wrong |
| 181–225 | markup: the canvas plus the HUD overlay | you add a button or a panel |
| 233–252 | maths helpers, `iso()`, `fmt()` | almost never |
| 253–419 | **the world tables** — `ITEMS`, `PATCHES`, `STATIONS`, `STALL`, `STAND`, `BOARD`, `COSMETICS`, `PADS` | most gameplay changes |
| 420–473 | game state: `resetGame()`, `newActor()`, the balance formulas | tuning |
| 474–625 | villagers, the queue, the farm stand, the stall keeper | anything about buyers |
| 626–856 | saving: `saveData`, `applySave`, `sanitiseSave`, the file envelope | a new field has to survive a reload |
| 857–922 | sound and input | controls |
| 923–1658 | **the simulation** — harvesting, stations, pads, farmhand AI, story, orders, party, `update()` | behaviour |
| 1659–2685 | **the rendering** — ground, crops, trees, buildings, items, people, `draw()` | how it looks |
| 2686–3084 | HUD sync, the bag panel, modals, `init()`, the frame loop | menus and screens |

Two functions matter more than the rest:

- **`update(dt)`** (1593) runs the world forward by `dt` seconds. It never draws.
- **`draw()`** (2592) paints the current state. It never changes anything.

That split is the single most important convention in the file. Keep it. It is why
the test suite can simulate ten minutes of farming in 40 milliseconds — it calls
`update()` in a loop and never waits for a frame.

## The data tables are the game

The valley is described, not coded. A workshop is one entry in `STATIONS` and one
in `PADS` with a matching `id`; `buyPad()` unlocks it by name with no other change.

```js
{ id:'bakery', name:'BAKERY', kind:'make', b:{x:3,y:35,w:7,h:5}, shape:'house',
  recipes:[ { in:{flour:1, cherry:2},       out:'cherrypie', time:3.0 },
            { in:{flour:1, egg:1, apple:1}, out:'pie',       time:2.6 } ],
  ... }
```

A workshop tosses a coin between the recipes it can make at that moment, and
holds the choice until the batch comes out. Taking them in order meant the
cherry version always won: the day the grove was planted, plain pies stopped
being made at all and the apples piled up with nowhere to go.

The same is true of `ITEMS` + `ITEM_ORDER` (every good), `PATCHES` (every crop),
`PADS` (every upgrade), `RANKS` (every title), `STORY` (every chapter) and
`COSMETICS`. **Prefer adding a row to writing a function.**

## Recipes

### Change a price, a cost or a rate
Prices live in `ITEMS` (264). Upgrade costs are `cost` × `mul` per level in `PADS`
(384) — `padCost()` does the maths. How fast a workshop works is the `time` on
its recipe; a batch is `1 + crew` of the thing, so halving a time doubles what
a hired artisan is worth as well. Everything else is a one-line formula at
423–434: carry capacity (capped at 400, and a hired hand at 80), harvest speed,
yield, regrowth, walk speed. A patch can slow the player down in it with
`pickMul` — the groves use 0.5, and it multiplies the scythe rather than
capping it. `levelReq()` (1580) is what a level costs in lifetime earnings.
Change a number, reload, play. Then run the tests.

### Add a good
1. Add its id to `ITEM_ORDER` (259) and a row to `ITEMS` (264) with `label` and
   `price`.
2. Give it a case in `drawItem()` (2113). That is the only picture the good
   has: it is what shows in a hand, on a tray, on the stall, and — through
   `itemIcon()` (2212), which paints the same code into a small canvas — in the
   HUD pills and the bag panel. There used to be an emoji column in `ITEMS` as
   well, and it drifted: a honey pot stood in for cherry jam long enough for
   someone to ask what the honey was.
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
the formula block at 409–420 rather than scattering `G.up.whatever` through the
simulation.

### Add a rank
A row in `RANKS` (1525), in level order. The ladder runs to 1000; `rankAt()`
resolves any level above the top of it, and a banner fires only from
`checkLevel()`, never from a save being loaded.

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
- **Nothing that matters goes on a square the player stands on.** The
  farmhands' takings were drawn on the SELL tray, which is exactly where you
  stand to collect them, so your own body covered the money and it looked as
  though the hands had earned nothing. The pile has its own square now
  (`TILL_PAD`) and is drawn with the depth-sorted entities — the trays go down
  before the buildings, so anything drawn with them ends up under a roof.
- **A villager who leaves has to leave by the road.** Served customers used to
  walk due north, which took them straight through the farm stand and the
  stall. They step out to `LEAVE_LANE` and walk back the way they came.
- **`sanitiseSave()` must not depend on the balance.** Clamp against things that
  follow from the mechanics — an upgrade's `max`, coins ≤ lifetime earned. Never
  against the cost table: prices get retuned, and a farm played on the old numbers
  would fail the check and be thrown away. That was written once and removed.

## Working on it

```sh
open index.html          # play it
node tests/run.js        # 519 checks, ~8 seconds
node tests/run.js ranks  # just the specs whose name matches
```

The page's own frame loop keeps running between one `page.evaluate` and the
next, so a spec that sets a bag down on a tray in one call and reads it in the
next may find it already sold. Set the position and the bag in the same call as
the thing under test.

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
