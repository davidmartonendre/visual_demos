/* The bridge between the game and the phone.
 *
 * sync.mjs injects this ahead of the game's own <script>, so window.HH_NATIVE
 * is defined before STORE.prime() looks for it. Nothing here is loaded in a
 * browser: on the web the game finds no bridge and stays on localStorage,
 * which is the whole point of the seam.
 *
 * If a call fails, or a plugin is missing, this file defines NOTHING rather
 * than defining something broken. A missing bridge costs a player their
 * cross-device sync; a half-working one costs them their farm.
 */
(function(){
  'use strict';

  var cap = window.Capacitor;
  var prefs = cap && cap.Plugins && cap.Plugins.Preferences;
  if(!prefs) return;                    // not in a Capacitor WebView, or plugin absent

  window.HH_NATIVE = {
    get: function(key){
      return prefs.get({ key: key }).then(function(r){
        return r && typeof r.value === 'string' ? r.value : null;
      });
    },
    set: function(key, value){ return prefs.set({ key: key, value: value }); },
    remove: function(key){ return prefs.remove({ key: key }); },

    /* What the player has BOUGHT, asked of the store on every boot.
     *
     * Billing is not wired yet, so this honestly reports that nothing is
     * owned. It must never read a file, a preference or anything else the
     * player can write -- that is the whole reason entitlements are not in
     * the save. When billing lands, this returns the ids Play confirms:
     *
     *   import { Purchases } from '@revenuecat/purchases-capacitor';
     *   const { customerInfo } = await Purchases.getCustomerInfo();
     *   return Object.keys(customerInfo.entitlements.active);
     *
     * RevenueCat caches the last answer itself, so a player who bought the
     * ad-free version keeps it on a plane. Rolling that cache by hand here
     * would mean writing it to disk, which is exactly the door we shut.
     */
    entitlements: function(){ return Promise.resolve([]); },
  };
})();
