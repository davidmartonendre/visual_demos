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
- Gameplay is data-driven: `STATIONS`, `PADS` and `ITEMS` at the top of the script
  define the buildings, upgrades and economy. Prefer editing those over adding code.
