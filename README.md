# 🌾 Harvest Hero

**The farm game from the playable ad — except this actually is the game.**

You know the ones: a little farmer sweeps through a wheat field, the crops fall, a
ridiculous stack of loot piles up over their head, they dump it at a counter and
money flies everywhere. Then you install it and it's a menu simulator with 47-hour
build timers.

This is that ad, built as an actual game. One HTML file. No install button that does
anything (there is one, it's a joke).

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
2. **Sell it.** Haul the stack to the `SELL` counter at the Market. Coins fly to your
   wallet.
3. **Stand on a glowing pad.** Your coins drain into it until the upgrade is paid off.
   Scythe reach, carry capacity, move speed, faster regrowth.
4. **Unlock the Chicken Coop.** Wheat goes in the `FEED` tray, eggs come out of the
   `TAKE` tray. Eggs sell for ~4× wheat.
5. **Hire farmhands.** They harvest and haul on their own, feeding whichever building
   is emptiest. They never sit idle; when both buildings are full they sell at the
   market instead.
6. **Unlock the Bakery.** Wheat + eggs → pies. Pies sell for ~11× wheat.
7. **Farm Level 12** is the finish line. There's a payoff.

Your farm saves to `localStorage` automatically. The ↺ button wipes it.

## Notes

- Progress persists across reloads; the 🔊 button mutes the synth sound effects.
- Everything is drawn procedurally on a 2D canvas in an isometric projection —
  no image files, no sprite sheets, no fonts to download.
- Roughly 1.8 ms of work per frame, so it idles at 60 fps with lots of headroom.
