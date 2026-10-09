/* Android's back button.
 *
 * On a phone, back with nothing listening closes the app. The game had no
 * handler at all, so a player mid-harvest tapped back and lost the screen --
 * these checks exist for that. Everything in this game is the one #modal, so
 * backing out is always "close what is open", and leaving is only offered
 * when nothing is.
 *
 * The bridge is faked here, as in 12-store: a real one needs a phone. The
 * page's rAF loop runs between evaluates, so each block sets up and acts in
 * one call.
 */
'use strict';

module.exports = {
  name: 'The back button',
  async run(t){
    await t.reset();

    /* ---- a browser: back closes panels, and otherwise does nothing ---- */
    const web = await t.get(()=>{
      const out = {};
      out.bridge = !!window.HH_NATIVE;

      openJournal();
      out.journalOpen = el('modal').classList.contains('on');
      out.closedJournal = goBack();
      out.afterJournal = el('modal').classList.contains('on');

      // the bag panel is the same modal, and must not stay half-open
      openBag('market');
      out.bagOpen = bagOpen;
      goBack();
      out.bagAfter = bagOpen;
      out.modalAfter = el('modal').classList.contains('on');

      // nothing open, no phone to leave: back declines rather than offering
      // a LEAVE button that leads nowhere
      out.nothing = goBack();
      out.openedSomething = el('modal').classList.contains('on');
      return out;
    });
    t.eq(web.bridge, false,      'a browser has no bridge, as ever');
    t.ok(web.journalOpen,        'the journal opens');
    t.ok(web.closedJournal,      'back reports it handled the press');
    t.eq(web.afterJournal, false,'and the journal is shut');
    t.eq(web.bagOpen, 'market',  'the bag panel opens at the counter');
    t.eq(web.bagAfter, null,     'back clears the panel state, not just the pixels');
    t.eq(web.modalAfter, false,  'and shuts the overlay with it');
    t.eq(web.nothing, false,     'with nothing open and no phone, back declines');
    t.eq(web.openedSomething, false, 'and opens nothing');

    /* ---- on a phone: back asks before leaving, and never leaves by itself ---- */
    const phone = await t.get(()=>{
      let exits = 0;
      window.HH_NATIVE = { exit: ()=>{ exits++; } };
      const out = {};

      G.coins = 512; G.earned = 60000;
      try{ localStorage.removeItem('harvest-hero-v1'); }catch(e){}

      out.handled = goBack();                       // nothing open -> the prompt
      out.asked = el('modal').classList.contains('on');
      out.title = el('m-title').textContent;
      out.saved = !!localStorage.getItem('harvest-hero-v1');
      out.exitsAfterAsking = exits;                 // asking must not quit

      // back again, on the prompt itself, backs out of the prompt
      const handledTwice = goBack();
      out.handledTwice = handledTwice;
      out.stillOpen = el('modal').classList.contains('on');
      out.exitsAfterTwo = exits;

      // KEEP PLAYING
      goBack(); el('m-cancel').click();
      out.exitsAfterCancel = exits;
      out.shutOnCancel = !el('modal').classList.contains('on');

      // LEAVE
      goBack(); el('m-ok').click();
      out.exitsAfterConfirm = exits;

      delete window.HH_NATIVE;
      closeModal();
      return out;
    });
    t.ok(phone.handled,             'with a phone under it, back handles the press');
    t.ok(phone.asked,               'by asking rather than quitting');
    t.eq(phone.title, 'Leave the farm?', 'and the question names what is at stake');
    // the farm is saved BEFORE the question, so a player who force-quits at the
    // prompt instead of answering it still keeps the afternoon
    t.ok(phone.saved,               'the farm is saved before the question is asked');
    t.eq(phone.exitsAfterAsking, 0, 'asking never quits on its own');
    t.ok(phone.handledTwice,        'back on the prompt is still handled');
    t.eq(phone.stillOpen, false,    'and backs out of it');
    t.eq(phone.exitsAfterTwo, 0,    'so tapping back twice does NOT quit the app');
    t.eq(phone.exitsAfterCancel, 0, 'KEEP PLAYING keeps playing');
    t.ok(phone.shutOnCancel,        'and shuts the prompt');
    t.eq(phone.exitsAfterConfirm, 1, 'only LEAVE leaves, and only once');

    /* ---- back must never quit while something is open ---- */
    const guard = await t.get(()=>{
      let exits = 0;
      window.HH_NATIVE = { exit: ()=>{ exits++; } };
      openShop();
      const handled = goBack();
      const out = { handled, exits, open: el('modal').classList.contains('on') };
      delete window.HH_NATIVE;
      closeModal();
      return out;
    });
    t.ok(guard.handled,      'back closes the shop');
    t.eq(guard.exits, 0,     'and never reaches the exit while a panel is open');
    t.eq(guard.open, false,  'the shop is shut');

    await t.reset();
  }
};
