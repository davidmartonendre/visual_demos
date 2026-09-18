# Where this should go next

The question: can Harvest Hero move onto something more standard for a game, so it
can be packaged for Android and iOS later, while the web stays the main platform —
and so a person who is not the author can work on it.

Short answer: yes, and it does not need a rewrite. It needs to be taken apart in
the right order. The costly part of a game is rarely the engine; it is the rules,
the balance and the art. Here, the rules are already data, and there is no art at
all — every pixel is drawn by code at runtime.

## What is actually limiting today

1. **One scope, 2,855 lines.** Every function and variable is global. Nothing
   declares what it depends on, so nothing can be moved, reused or tested in
   isolation, and a rename breaks callers silently. This is the real ceiling, and
   it has nothing to do with the choice of engine.
2. **No assets.** Buildings and people are drawn with `lineTo` and `fill`. That is
   why the whole game is 128 KB and loads instantly — and also why nobody who
   draws can contribute to it. An artist cannot open a `<canvas>` call in Aseprite.
   Every visual change has to be made by a programmer, by hand, in code.
3. **Everything is hand-rolled.** The loop, the camera, the projection, the sound,
   the input, the save format, the UI. All of it works, and all of it is code we
   maintain instead of code someone else maintains. A framework is mostly a trade:
   less of your own code, more of someone else's conventions.
4. **Web-only by construction.** It runs in a browser. It does not know about
   touch back-buttons, app lifecycle, safe areas beyond CSS, IAP or app stores.

## The options

| | What you get | What it costs | Mobile apps |
|---|---|---|---|
| **Stay vanilla, modularise** | Full control, zero dependencies, nothing new to learn | You keep writing engine code forever | via Capacitor |
| **PixiJS** | A fast WebGL renderer, sprites and atlases, nothing else | You still write the loop, scenes, input, audio | via Capacitor |
| **Phaser 3** | Loop, scenes, sprites, atlases, tilemaps, animation, input, audio, physics, tweens, camera — the standard web 2D game framework | A framework's structure and vocabulary; a rendering rewrite | via Capacitor |
| **Godot 4** | A real editor: scene tree, animation timeline, tilemap painter, particle designer. Non-programmers can genuinely work in it | Full rewrite in GDScript; web export is tens of megabytes and poor on mobile browsers; iOS export needs a Mac and Xcode | native, first-class |
| **Unity** | Everything, plus an industry-scale ecosystem | Heavy, licensed, and its web builds are not aimed at mobile browsers | native, first-class |

Unity is out: wrong scale of tool for a farm game, and its web story is the weakest
of the list while web is the priority. Godot is the tempting one — it is the answer
to "let a human work on this without writing code" — but it is the wrong answer
while web is the main platform, because a Godot web build is a large WebAssembly
download that browsers on phones handle badly. If the priority ever flips to
*apps first, web second*, revisit it; it is a genuinely good engine and the port
would be mostly re-authoring content that is already written down.

That leaves the three web options, and they are not really alternatives — they are
the same road at three distances.

## The recommendation: four stages, each shippable

The principle underneath all of it: **keep the rules separate from the drawing.**
Simulation code that knows nothing about canvas, Phaser or the DOM can be tested in
milliseconds, ported to any renderer, and read by someone who does not know the
renderer. That separation is worth more than any framework choice, and it is the
one thing that makes every later stage cheap.

### Stage 1 — split the file, add a dev server
Vite. `index.html` becomes a dozen ES modules under `src/`: `data/` for the tables,
`sim/` for the rules, `render/` for the drawing, `ui/` for the HUD. Each one states
its imports, so you can finally see what depends on what. Vite gives instant reload
while editing and produces a plain static build for Azure.

What it costs: the "just open index.html" promise. From here on you run
`npm run dev`, and deploying runs a build. That rule in `AGENTS.md` was a
deliberate choice and this is the moment it stops paying for itself.

Nothing about the game changes. The tests keep passing against the built file.
**This is the stage that matters most and the only one I would do immediately.**

### Stage 2 — TypeScript
Types on the data tables, on `G`, and on the bag-of-goods shape. Read back through
this project's history: the stale item lists, `s.recipe.out` after stations gained
multiple recipes, a test calling `hud()` when it is `syncHUD()`. Every one of them
is a compile error in TypeScript and none of them is a runtime bug. Fits in
alongside JavaScript file by file; nothing has to convert at once.

### Stage 3 — Phaser 3 for the presentation layer
Phaser takes over the loop, the camera, input, audio, sprites, animation and
tweens. The simulation modules from Stage 1 come across unchanged and Phaser never
learns what a pie is. The isometric maths stays exactly as it is — `iso()` is four
multiplications and no framework does it better.

Take this stage with the move to sprites, because they arrive together: the moment
there is a sprite sheet, someone who draws can add a building without touching
code, and Phaser is where sheets, atlases and animation stop being your problem.
PixiJS instead of Phaser if it turns out that all we want is the renderer — but
then the loop, scenes, input and audio stay ours, and we already have those.

### Stage 4 — Capacitor for Android and iOS
Capacitor wraps the same web build in a native shell and gives it the store
pipeline, the splash screen, the back button, safe areas and native plugins. The
web build stays the source of truth, so there is one game, not three. iOS still
needs a Mac with Xcode to build and submit; that is Apple's rule, not Capacitor's.

## Letting a human work on it

Separate from the engine question, and mostly cheaper:

- **Content in data files.** The tables already are data; Stage 1 moves them into
  their own modules, and they could be JSON that a spreadsheet writes. Balance
  changes then need no programmer.
- **Sprites instead of code.** Aseprite for the art, a texture atlas, Tiled for
  the map. This is the change that turns "a programmer must do it" into "anyone who
  draws can do it", and it is the single biggest unlock for working together.
- **A tuning panel.** A dev-only overlay with sliders for prices, costs and rates
  and a copy-out button. Balancing a tycoon game by editing constants and reloading
  is the slow way; balancing it live is the fast one.
- **The tests as a safety net.** They already exist. They are what makes it safe
  for someone who does not know the whole file to change part of it.
- **The docs in this folder.** `architecture.md` says where things live and which
  traps are already known.

## What I would not do

- Rewrite from scratch. The game works and is fun; rewrites lose that and rarely
  admit it.
- Add a framework before splitting the file. Phaser on top of one global scope is
  the same problem with more vocabulary.
- Chase native performance. A 2D farm game on a canvas is nowhere near any limit —
  it runs at 60fps on a phone drawing every blade of wheat procedurally.
