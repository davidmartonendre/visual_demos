/* The bridge between the game and the phone.
 *
 * sync.mjs injects this ahead of the game's own <script>, so window.HH_NATIVE
 * is defined before STORE.prime() looks for it. Nothing here runs in a
 * browser: without Capacitor the file defines nothing, the game finds no
 * bridge and stays on localStorage, which is the whole point of the seam.
 *
 * Each plugin is optional on its own. A missing one costs only the piece it
 * owns -- no storage, or no back button -- rather than taking the rest with
 * it. What must never happen is a bridge that LOOKS present and half works:
 * STORE.prime() calls get() and adopts the bridge only if it answers, so a
 * broken store is declined rather than trusted.
 *
 * The game's own globals (save, STORE, goBack) are used inside callbacks, not
 * at load time -- this file runs first, so they do not exist yet. They are
 * declared in the same global scope by the time anything here fires.
 */
(function(){
  'use strict';

  var cap = window.Capacitor;
  if(!cap || !cap.Plugins) return;              // a browser
  var prefs = cap.Plugins.Preferences;
  var app   = cap.Plugins.App;

  var api = {};

  if(prefs){
    api.get = function(key){
      return prefs.get({ key: key }).then(function(r){
        return r && typeof r.value === 'string' ? r.value : null;
      });
    };
    api.set    = function(key, value){ return prefs.set({ key: key, value: value }); };
    api.remove = function(key){ return prefs.remove({ key: key }); };
  }

  /* What the player has BOUGHT, asked of the store on every boot.
   *
   * Billing is not wired yet, so this honestly reports that nothing is owned.
   * It must never read a file, a preference or anything else the player can
   * write -- that is the whole reason entitlements are not in the save. When
   * billing lands, this returns the ids Play confirms:
   *
   *   import { Purchases } from '@revenuecat/purchases-capacitor';
   *   const { customerInfo } = await Purchases.getCustomerInfo();
   *   return Object.keys(customerInfo.entitlements.active);
   *
   * RevenueCat caches the last answer itself, so someone who bought the
   * ad-free version keeps it on a plane. Rolling that cache by hand here
   * would mean writing it to disk, which is exactly the door we shut.
   */
  api.entitlements = function(){ return Promise.resolve([]); };

  if(app){
    api.exit = function(){ app.exitApp(); };

    /* Back closes whatever is open and, with nothing open, lets the game ask
       before leaving. Quitting outright is the fallback for the case where
       the game has not loaded yet -- otherwise back would do nothing at all
       and the app would feel stuck. */
    app.addListener('backButton', function(){
      var handled = false;
      try { handled = typeof goBack === 'function' && goBack(); } catch(e){}
      if(!handled) app.exitApp();
    });

    /* Android can kill a backgrounded app without warning. The autosave has
       at most a few seconds of play in it and localStorage always holds a
       mirror, so nothing is ever lost outright -- this just makes sure the
       queued native write is on disk while we are still allowed to run. */
    app.addListener('pause', function(){
      try { if(typeof save === 'function') save(); } catch(e){}
      try { if(typeof STORE === 'object' && STORE && STORE.flush) STORE.flush(); } catch(e){}
    });
  }

  window.HH_NATIVE = api;
})();
