# The Android shell

Harvest Hero is one HTML file with no build step. This folder wraps that file
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
npx cap add android          # generates android/ -- once, ever
npm run android              # copy the game, sync, open Android Studio
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
| `npm run test:build` | **build the release file and run all 563 checks against it** |

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

- **`appId` is permanent; the store name is not.** The id is
  `io.github.davidmartonendre.pepere`, after the farming district outside
  Hódmezővásárhely. It is tied to a GitHub account rather than a domain or a
  company, so it outlives both. After the first upload to Play it can never be
  changed, only abandoned — so it is the one thing worth settling before you
  build. The name on the listing can be changed any afternoon.
- **The name still wants deciding.** "Harvest Hero" is taken twice over: a
  match-3 game on Google Play (`com.vg.harvesthero`) and *Harvest Hero Origins*
  on Steam, and `harvesthero.com` is registered. Nothing stops you shipping
  under it — Play allows duplicate names — but you would launch into a search
  result you do not own. `Hollowbrook`, the valley in the game, is a horror
  game on Steam as of 2025, so keep that one inside the story. Nothing at all
  ships as *Pepere*.
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
  `privacy.html` beside `index.html` is the cheapest honest answer.
- The data safety form, and an age rating. Rate it for everyone but keep it
  **out of the Kids category** unless you mean it: a child-directed listing
  bans personalised ads and takes the rate down with it.

## Still missing from the shell

Things a browser does not need and a phone does. None is hard; all are
invisible until you are holding the device.

- **The back button.** Android's back closes the app by default, and the game
  has no handler at all — so a player mid-harvest presses back and loses the
  screen. It should close the bag panel or a modal first, and ask before
  quitting.
- **Orientation.** The game is built tall (the HUD sits along the bottom);
  nothing locks it to portrait yet.
- **`STORE.flush()` when the app goes to the background**, so a queued native
  write is on disk before Android is free to kill the process. The
  `localStorage` mirror already covers the worst case, so this is tidiness
  rather than a hole.
- A splash screen, and the app icon itself.

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
