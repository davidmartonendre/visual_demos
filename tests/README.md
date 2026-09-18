# Tests

A regression suite for `index.html`. The game itself still has no dependencies
and no build step — this directory is the one place that needs a tool, and only
a browser driver:

```sh
npm install -g playwright && npx playwright install chromium
```

Then, from the repo root:

```sh
node tests/run.js            # everything
node tests/run.js save hand  # only specs whose file name matches
node tests/run.js -v         # print every check, not just the failures
```

It exits non-zero if anything fails, so it drops straight into CI or a git
hook. A full run is around 400 checks in under ten seconds.

## How it works

The game is one file with everything at script scope, so a spec loads it in a
headless browser and calls the game's own functions — `buyPad()`, `importSave()`,
`sanitiseSave()`, `openShop()`. There is no mock layer and no test build:
whatever a spec exercises is the code that ships.

**Specs never sleep.** `t.tick(seconds)` calls the game's own `update()` in
1/60 steps, so ten simulated seconds cost a few milliseconds and never depend on
how fast the machine is. The corollary: anything that only happens inside
`draw()` is invisible to a tick, so assert on state, not on pixels.

## Writing one

A spec is a file in `specs/` exporting a name and a `run`:

```js
module.exports = {
  name: 'What this covers',
  async run(t){
    await t.reset();                       // a fresh farm
    await t.run(()=>{ G.coins = 500; });   // runs in the page
    await t.stand(11.2, 5.5);              // put the player somewhere
    await t.tick(10);                      // ten seconds of game time
    const v = await t.get(()=>({ coins: G.coins }));
    t.eq(v.coins, 530, 'selling pays list price');
  }
};
```

`t.ok`, `t.eq`, `t.near`, `t.gt`, `t.gte`, `t.lte` record a check and carry on,
so one run reports everything that is wrong. `t.must` stops the spec when a
precondition fails and there is no point continuing. Any uncaught page error or
console error fails the spec on its own.

Functions passed to `t.run`/`t.get` are serialised into the browser, so they can
close over nothing from the spec file — pass what they need as the second
argument.

## What each spec is for

| Spec | Covers |
| --- | --- |
| `01-data` | The data tables: every good priced, drawn, obtainable; every station reachable from a pad |
| `02-harvest` | Cutting, carrying, bag capacity, and selling at list price with nothing left negative |
| `03-chains` | Every recipe, the cherry variants taking priority, tray caps, artisan batch size |
| `04-hands` | The delivery deadlock, lazy naps, the routing watchdog, and the till |
| `05-crew` | Orchard pickers, the stall keeper, bulk stocking and the stock cap |
| `06-save` | Round trips, the tamper envelope, and every clamp in `sanitiseSave()` |
| `07-ranks` | The rank ladder, the banner firing only on a real level-up, the levels menu |
| `08-party` | Buying it, work stopping, the crowd gathering, two alternating dance moves |
| `09-progress` | Pads, hiring, `availableItems()` as the source of truth, the shop |
| `10-ui` | Boot, frame cost, the restart dialog's ways out, the save box, the journal |

Most checks exist because the thing they check was broken once. Where that is
true the comment says so, and it is worth reading before "simplifying" one away.
