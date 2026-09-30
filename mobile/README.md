# The Android shell

Pepere is one HTML file with no build step. This folder wraps that file
in a native app so it can go on Google Play, and gives it the two things a
browser cannot: a durable place to keep a save, and later a way to be paid.

**The game is still `../index.html`.** Nothing in here is the source of
anything. `sync.mjs` copies that file into `www/` on every build; edit the
copy and your next build eats it.

## What you need on the Mac

- Node 20 or newer (`node --version`)
- [Android Studio](https://developer.android.com/studio), and a JDK 17 or 21
  (Android Studio ships one: Settings → Build → Build Tools → Gradle)

No Xcode, no Apple money, not yet. iOS is a later `npx cap add ios` against
this same folder.

## First run

```bash
cd mobile
npm install
npx cap add android          # generates android/
npm run android              # copy the game, sync, set the manifest, open Studio
```

Then press ▶ in Android Studio with a device plugged in or an emulator
running. That is the whole loop: change `../index.html`, `npm run android`,
press ▶ again.

## The builds

| | |
|---|---|
| `npm run sync` | copy the readable game into `www/` |
| `npm run sync:release` | the same, compressed and stripped of comments |
| `npm run android` | sync, then open Android Studio |
| `npm run android:release` | release sync, then open Android Studio |
| `npm run icons` | redraw the app icon and splash from the game's own art |
| `npm run assets` | that, then generate every Android density from them |
| `npm run manifest` | set the manifest attributes Capacitor does not |
| `npm run test:build` | **build the release file and run all 586 checks against it** |

That last one is the point of the arrangement. The release build compresses
the game but deliberately leaves top-level names alone, so the whole suite
runs against the exact file that goes in the APK. Run it before you ship.

## Checking the bridge actually bit

`hh-native.js` gives the game a native place to keep saves. If the plugin is
missing it defines nothing at all, and the game quietly falls back to the
WebView's `localStorage` — which works, and which Android may clear under
storage pressure. So check it once:

1. With the app running, open `chrome://inspect` in Chrome on the Mac and
   click **inspect** under the app.
2. In the console: `STORE.native` — should be an object, not `null`.
3. Play until you have some coins, force-quit the app from the task switcher,
   reopen it. The farm should be there.

A fresh install starts empty on purpose: `Preferences` is wiped on uninstall,
the same as any app's data. Surviving a *reinstall* is what cloud save is
for, and that is not built yet.

## Before Google will take it

- **`appId` is permanent.** It is `io.github.davidmartonendre.pepere`. After
  the first upload to Play it can never be changed, only abandoned. The name on
  the listing can be changed any afternoon, so the id is the only part of this
  worth settling before you build.
- **It is deliberately not built on `pepere.lol`.** Reverse-DNS is a convention
  for avoiding collisions, not a claim of ownership — Play never checks who
  holds the domain, and a package name is yours permanently once uploaded. So a
  domain-shaped id buys nothing, while committing the one string that can never
  change to one that must be paid for every year. `.lol` renews at roughly
  twenty times its first-year price. A GitHub account has no renewal date.
  **Do not "correct" this to a domain later**: by then it cannot be changed at
  all, and the domain may belong to someone else.
- **The name is Pepere**, after the farming district outside Hódmezővásárhely.
  It was *Harvest Hero* until that went on a store listing: there is already a
  match-3 game of that name on Google Play (`com.vg.harvesthero`) and *Harvest
  Hero Origins* on Steam, and `harvesthero.com` is taken. `Hollowbrook`, the
  valley inside the game, is a horror game on Steam as of 2025 — fine in the
  story, wrong on a shelf beside it. Nothing at all ships as *Pepere*.
- **Keep the domain out of anything hard to change.** `pepere.lol` is a nice
  address to hand people and nothing depends on it. What would hurt is putting
  it where it cannot be pulled back: the privacy policy URL above all, because
  Play requires that link to work and pulls apps whose link has died. Worse
  than losing the domain is somebody else buying it — an expired domain with
  traffic gets picked up quickly, and then your store listing points at a
  stranger's site under your game's name. Never set up App Links
  (`assetlinks.json`) on a domain you might drop: whoever holds it can claim
  your deep links. Two smaller things: some corporate and school networks block
  novelty TLDs, and mail from a `.lol` address lands in spam more often than it
  should.
- A Play Console account: **$25, once**. A brand-new personal account must
  then run a closed test with **12 testers for 14 days** before it can go
  public, so start that clock early — it is the longest pole here by weeks.
- An upload key. Android Studio: Build → Generate Signed App Bundle → create
  a keystore. **Back that file up somewhere you will still have it in three
  years.** Lose it and you cannot update your own app.
- Icon (512×512 and the adaptive layers), a 1024×500 feature graphic, at least
  two phone screenshots, an 80-character short description and a long one.
- **A privacy policy at a real URL.** Play requires one the moment an ad or
  analytics SDK is in the build. The Azure site already serves this repo, so a
  `privacy.html` beside `index.html` is the cheapest honest answer. Put the
  **Azure URL** on the listing, not a `pepere.lol` one, even if you point the
  domain at the same site: the listing should survive the domain lapsing.
- The data safety form, and an age rating. Rate it for everyone but keep it
  **out of the Kids category** unless you mean it: a child-directed listing
  bans personalised ads and takes the rate down with it.

## The manifest

`npx cap add android` generates `android/`, and `manifest.mjs` makes the one
edit it needs: `android:screenOrientation="portrait"`, because the game is
drawn tall and the HUD runs along the bottom. A runtime plugin could do the
same, but a manifest attribute costs no dependency and no frame of the app
appearing sideways first.

`npm run android` runs it for you. It is idempotent, and it fails loudly
rather than quietly doing nothing if the manifest is not the shape it
expects — a silent no-op there turns up as a bug on a device much later.

One thing Capacitor sets that is worth knowing about: `allowBackup="true"`.
Android's own auto-backup will copy the Preferences store to the player's
Google Drive, so a farm already survives a new phone in a rough sort of way,
before any cloud save is written. It can also restore a stale farm over a
newer one, which is the case `resolveSave()` exists for.

## The icon

`npm run icons` draws it from `drawItem('wheat')` — the same sheaf the game
puts in your bag. Nothing is drawn twice by hand, so the icon cannot drift
away from the game the way `ITEMS`' emoji column once drifted away from
`drawItem()`. It writes `assets/`, which is build output and not committed:

| | |
|---|---|
| `icon-only.png` | the flat icon, for the Play listing |
| `icon-foreground.png` | the sheaf alone, kept inside the safe zone an adaptive icon may mask to |
| `icon-background.png` | the field behind it |
| `splash.png`, `splash-dark.png` | the launch screen |

`npm run assets` then runs `@capacitor/assets` over them to produce every
density Android wants.

## What the shell already handles

- **The back button.** Android's back closes an app with no listener, so back
  mid-harvest used to lose the screen. It now closes whatever panel is open —
  they are all the one `#modal` — and only when nothing is open does it ask
  whether to leave, saving first. Tapping back twice does not quit. The logic
  is `goBack()` in the game, not in the bridge, so the tests cover it.
- **Saving when the app goes to the background.** Android may kill a
  backgrounded app without warning, so `pause` saves and flushes the queued
  native write while the process is still allowed to run.

## What is not here yet

- **Billing.** `hh-native.js` reports that the player owns nothing, honestly,
  because nothing is wired. The game already asks the right question
  (`adsOff()`) and already refuses to take the answer from a save file, so
  this is a matter of filling in `entitlements()` — the RevenueCat call is
  written out in a comment there.
- **Ads.** Nothing calls `adsOff()` yet because there is nothing to switch
  off. `@capacitor-community/admob` is the plugin when it is time.
- **Cloud save.** `resolveSave()` in the game merges two devices already;
  Play Games Saved Games is the store to plug into `STORE`.
