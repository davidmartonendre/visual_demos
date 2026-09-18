# Harvest Hero

A single-file browser game. **There is no build system, no package manager, and no
framework here** — this repo previously held a Next.js site and it was removed
deliberately.

- The entire game is `index.html`: markup, CSS and JS in one file.
- To run it, open `index.html`. Do not add a dev server, bundler or dependency
  unless asked — "no build step" is a feature of this project.
- The one exception is `tests/`, which needs Playwright and nothing else. There is
  no `package.json` anywhere and there must not be: the Azure deploy uploads the
  repo root as-is, and a root `package.json` makes Oryx treat the site as a Node
  app and fail the build looking for a build script.
- **Run `node tests/run.js` before you push.** ~400 checks in under ten seconds
  against the real file. Most of them exist because the thing they check was broken
  once, and the comment above such a check says so — read it before deciding a
  failure is the test's fault. When you fix a bug, add the check that would have
  caught it; when you add a feature, add a spec for it.
- `docs/architecture.md` is the map of this file — section line ranges, the recipes
  for adding a good or a building, and the bugs that have already been written here
  once. `docs/engine-options.md` is the standing plan for moving off a single file.
- Rendering is canvas 2D with a hand-rolled isometric projection
  (`iso()`, `worldToScreen()`); the world is in tile units and screen work happens
  in iso-space pixels inside one `ctx.translate/scale` transform.
- Buildings are drawn from `drawBuilding()`. Doors and windows are placed in
  face space via `facePt`/`faceQuad` — two ground corners plus the wall height —
  so they sit flat on a wall instead of floating in front of it. Doors go on the
  east face, which is the one the trays stand against.
- Roofs overhang the eaves but must stay flush at the gable ends. A roof that
  oversails the end wall straddles the gable plane, and no draw order shows the
  gable triangle correctly; with flush ends the triangle can simply be drawn over
  the roof, with a barge board along the edge. `shape` picks the massing:
  `house`, `shed` (low, mostly door) or `mill` (tall, blades on the gable).
- Entities are depth-sorted by `x + y`. Anything with height (buildings) will
  occlude whatever sits at a *smaller* `x + y`, which is why the farm buildings are
  on the west/far side and the player's yard is east/near. Keep it that way.
- Gameplay is data-driven: `STATIONS`, `PADS`, `ITEMS`, `ITEM_ORDER`, `PATCHES`,
  `STAND`, `QUEUE` and `BOARD` at the top of the script define the buildings,
  upgrades, goods, crops and buyers. Prefer editing those over adding code — a new
  building is a `STATIONS` entry plus a `PADS` entry with the same `id`, and
  `buyPad()` unlocks it by name automatically.
- Anything the player can carry must be in `ITEM_ORDER` and `ITEMS`, have a case in
  `drawItem()`, and be produced either by a station recipe or a patch. That drawing
  is the good's only picture: `itemIcon()` paints the HUD pills and the bag panel
  rows from the same code. `ITEMS` had an emoji column beside it once and the two
  drifted apart — a honey pot stood in for cherry jam, a tub of ice cream for
  cherry pie. `emptyBag()`
  builds every inventory, so never hand-write `{wheat:0, egg:0}` literals.
- Never hard-code a list of goods anywhere else either: iterate `ITEM_ORDER` or
  `availableItems()`. Four places were left listing only wheat/egg/pie after the
  valley expanded, and the market's was harmful — it fell through to `'wheat'` for
  anything unlisted, subtracted from an empty stack, and drove the wheat count
  negative while paying wheat rates for cheese. Anything that picks an item to move
  must pick one the actor is actually holding, and bail out when there is none.
- Anything laid out along a building (stall produce, counter prices) must be spaced
  from that building's own width and capped, or it marches off the end once enough
  goods are unlocked.
- `availableItems()` is the single source of truth for what exists yet; the HUD
  pills, the villagers' wants and the order board all derive from it, which is what
  keeps the game from asking for goods the player cannot make.
- Villagers are real customers, not scenery: they queue at the farm stand and buy
  what their bubble asks for. Anything that gives an NPC a visible want must be
  serveable. Once served they step out to `LEAVE_LANE` and walk back down the road
  they came up; leaving northwards walked them through the stand and the stall.
- Farmhands only ever carry wheat. They must never pick up from an `out` tray:
  nothing but wheat can be unloaded at the places they walk to, so one stray item
  strands them in `deliver` forever, shuffling between input trays. `deliveryTarget()`
  therefore routes by what an actor is actually carrying, and only the market — which
  buys everything — is a valid destination for a non-wheat load. There is also a
  watchdog: a load that has not gone down in 10s re-routes to the market.
- Half of hired farmhands are lazy (`a.lazy`, rolled once in `newActor`, persisted in
  `G.handLazy` so a reload cannot reroll it). A lazy hand works a stretch, then naps
  where it stands and resumes. Naps are drawn lying down with closed eyes and z's —
  idle behaviour must always *look* deliberate, or it reads as the bug above.
- Item transfers move in parcels sized from carrying capacity (`flowStep`), because
  a late-game backpack holds over a thousand items. Size a parcel from a constant
  (capacity, tray cap), never from the amount remaining — that decays geometrically
  and the last items never arrive.
- Story chapters live in `STORY`; each has a `when()` predicate polled by
  `checkStory()`, fires once, and is recorded in `G.story` / the journal.
- Save migration matters: `applySave()` has to cope with saves written by older
  builds (e.g. a bakery that predates the windmill now feeding it).
- There is one save shape: `saveData()` builds it, `applySave()` restores it, and
  localStorage and the downloadable save file both carry exactly that. Add a field
  in `saveData()` and read it in `applySave()` — never write a second serialiser.
- Imported saves are untrusted input: `importSave()` decodes, sanitises and only then
  resets the world, so a bad paste can never leave a half-applied farm.
- Saves are wrapped by `encodeSave()`/`decodeSave()`: the payload is scrambled and
  stamped, so editing a save in a text editor makes it fail to load. Treat this as
  tamper evidence only — the key is in this file and the console can edit `G`
  directly. Never describe it as security.
- `sanitiseSave()` is the real defence and must stay balance-independent. Clamp using
  bounds that follow from the game's mechanics (upgrade `max`, coins <= earned +
  START_COINS, payouts recomputed from goods), never from the cost table: costs are
  retuned often, and a farm played across a rebalance would fail such a check and be
  thrown away. That bug was written once already and removed.
- Anything the player unloads somewhere with a cap (a tray, the stall's stock) must
  reserve what is already in the air. The amount only goes up in the flyer's `onDone`,
  so a loop that checks the stored figure keeps unloading against a number seconds
  out of date and sails past the cap. Trays use `s.pend`; the stall uses `stockPend`,
  which is deliberately not saved — nothing is in flight across a reload.
- Farmhands come in jobs (`a.job`): `field` cuts wheat, `orchard` picks the groves,
  `stall` minds the farm stand and never leaves it. A picker carries fruit, so the
  "only ever wheat" rule above is really "only what `deliveryTarget()` can place" —
  keep the two in step if a new job is added.
- Farmhand takings go to `G.till` at the market, not to `G.coins`. The player
  collects by stepping on the SELL tray. Never pay a hand's sale straight into coins:
  it fires the coin effect continuously for work the player is not doing.
- With a keeper hired the stand pad changes mode (`serveStand()` → `stockStand()`)
  and `keeperServe()` works the queue from `G.stock`. Anything that touches the stand
  has to handle both.
- Walking onto a tray moves the whole bag. The bag panel (`openBag()`) is the
  deliberate version of the same thing: it offers itself within five tiles of the
  counter or the stand, moves one good at a time, and has the farmhands' takings on
  a button of its own. While it is open the player's `tryStations()` stands down,
  or the load would be gone before the first button was pressed. Anything new at the
  counter or the stand needs a row in it.
- A workshop with more than one recipe it can make tosses a coin between them and
  holds the choice until the batch is out. Taking them in order meant the cherry
  version always won and plain pies were never made again once the grove was
  planted. A plain pie needs an apple as well as an egg, so the pickers' fruit
  feeds the oven and not only the jam pan. A batch takes twice as long as it did
  before artisans existed: `1 + crew` items at the old times filled the out trays
  faster than anyone could carry them away.
- Nothing that matters is drawn on a square the player stands on: their own body
  covers it. The takings pile has its own square beside the counter (`TILL_PAD`),
  and is drawn with the depth-sorted entities rather than with the trays, which go
  down before the buildings.
- Every level has a rank title from `RANKS`; `rankAt()` resolves any level, including
  ones above the top of the ladder. A banner fires only from `checkLevel()`, on a real
  level-up that lands exactly on a rank. Loading a save recomputes the level from
  lifetime earnings, and must never fire one — a returning player would get a stack.
- `COSMETICS` and the party are bought from `openShop()` and stored in `G.cos` /
  `G.wear`. `sanitiseSave()` drops anything not in the table and refuses to wear
  something that is not owned.
- The party (`startParty()` / `endParty()`) suspends work: `update()` skips harvesting,
  stations, pads, customers, orders and story while `partyOn()`. Anything added to the
  world loop needs deciding on one side of that branch or the other.
