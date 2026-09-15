# 🌾 Harvest Hero

A cosy isometric farm tycoon that runs in one HTML file.

Sweep through a wheat field and the crop falls in an arc around you, stacking into a
tower over your head. Haul it to the market, spend the coins on upgrades, unlock
buildings that turn wheat into something worth more, and hire a crew to do the
cutting for you.

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

## The loop

1. **Sweep the wheat.** Walk through the golden field; your scythe cuts everything in
   reach and it stacks over your head.
2. **Sell it.** Two places will take it:
   - the `SELL` counter at the **Market** buys anything, any amount, at list price;
   - the **Farm Stand** on the village road pays **70% over market**, but only for
     what the villagers in the queue are actually asking for.

   Bulk goes to the market; the queue is a steady trickle of better money right next
   to the field. Serving is the one job the farmhands never do for you.
3. **Stand on a glowing pad.** Your coins drain into it until the upgrade is paid off.
   Scythe reach, carry capacity, move speed, faster regrowth.
4. **Unlock the Chicken Coop.** Wheat goes in the `FEED` tray, eggs come out of the
   `TAKE` tray. Eggs sell for ~4× wheat.
5. **Hire farmhands.** They harvest and haul on their own, feeding whichever building
   is emptiest. They never sit idle; when both buildings are full they sell at the
   market instead. Moving eggs to the bakery and serving the queue stay your jobs —
   that's what keeps you useful once the farm is automated.
6. **Unlock the Bakery.** Wheat + eggs → pies. Pies sell for ~11× wheat.
7. **Farm Level 12** is the finish line, though the upgrade pads keep going past it.

Your farm saves to `localStorage` automatically. The ↺ button wipes it.

## Notes

- Progress persists across reloads; the 🔊 button mutes the synth sound effects.
- Everything is drawn procedurally on a 2D canvas in an isometric projection —
  no image files, no sprite sheets, no fonts to download.
- Roughly 1.8 ms of work per frame, so it idles at 60 fps with lots of headroom.
- Villagers only ever ask for goods you can currently produce, so there are no
  impossible orders before the coop and bakery are open.
- Buildings, upgrades, prices and the stand are data-driven: see `STATIONS`, `PADS`,
  `ITEMS`, `STAND` and `QUEUE` at the top of the script.
