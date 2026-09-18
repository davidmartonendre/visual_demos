# Harvest Hero

A single-file browser game. **There is no build system, no package manager, and no
framework here** — this repo previously held a Next.js site and it was removed
deliberately.

- The entire game is `index.html`: markup, CSS and JS in one file.
- To run it, open `index.html`. Do not add a dev server, bundler or dependency
  unless asked — "no build step" is a feature of this project.
- Rendering is canvas 2D with a hand-rolled isometric projection
  (`iso()`, `worldToScreen()`); the world is in tile units and screen work happens
  in iso-space pixels inside one `ctx.translate/scale` transform.
- Entities are depth-sorted by `x + y`. Anything with height (buildings) will
  occlude whatever sits at a *smaller* `x + y`, which is why the farm buildings are
  on the west/far side and the player's yard is east/near. Keep it that way.
- Gameplay is data-driven: `STATIONS`, `PADS`, `ITEMS`, `ITEM_ORDER`, `PATCHES`,
  `STAND`, `QUEUE` and `BOARD` at the top of the script define the buildings,
  upgrades, goods, crops and buyers. Prefer editing those over adding code — a new
  building is a `STATIONS` entry plus a `PADS` entry with the same `id`, and
  `buyPad()` unlocks it by name automatically.
- Anything the player can carry must be in `ITEM_ORDER` and `ITEMS`, have a case in
  `drawItem()`, and be produced either by a station recipe or a patch. `emptyBag()`
  builds every inventory, so never hand-write `{wheat:0, egg:0}` literals.
- `availableItems()` is the single source of truth for what exists yet; the HUD
  pills, the villagers' wants and the order board all derive from it, which is what
  keeps the game from asking for goods the player cannot make.
- Villagers are real customers, not scenery: they queue at the farm stand and buy
  what their bubble asks for. Anything that gives an NPC a visible want must be
  serveable.
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
