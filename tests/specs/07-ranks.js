/* Levels, rank titles and the congratulation banner.
 *
 * A banner must only fire on a real level-up. Loading a save recomputes the
 * level from lifetime earnings, and firing banners for that would greet a
 * returning player with a stack of them.
 */
'use strict';
module.exports = {
  name: 'Levels and titles',
  async run(t){
    await t.reset();

    const ladder = await t.get(()=>({
      ranks: RANKS.map(r=>({ lv:r.lv, name:r.name, line:r.line })),
      first: RANKS[0].lv,
      at1: rankAt(1).name, at2: rankAt(2).name,
      top: rankAt(99999).name, above: nextRank(99999),
    }));
    t.eq(ladder.first, 1, 'level 1 already has a title');
    t.eq(ladder.at1, ladder.at2, 'a level between ranks keeps the one below');
    t.eq(ladder.above, null, 'the ladder has a top');
    for(let i=1;i<ladder.ranks.length;i++)
      t.gt(ladder.ranks[i].lv, ladder.ranks[i-1].lv, 'rank ' + i + ' comes after the one before');
    for(const r of ladder.ranks){
      t.ok(!!r.name, 'level ' + r.lv + ' has a title');
      t.ok(!!r.line, 'level ' + r.lv + ' has something to say');
    }

    /* A level-up that lands on a rank shows the banner. */
    const boundary = ladder.ranks[2];      // the first one you actually climb to
    await t.run(lv => { G.level = lv - 1; G.earned = levelReq(lv - 1) - 1; syncHUD(); }, boundary.lv);
    await t.run(()=>{ G.earned += 1; checkLevel(); });
    const shown = await t.get(()=>({ level: G.level, on: el('banner').classList.contains('on'),
      kicker: el('bn-k').textContent, title: el('bn-t').textContent, line: el('bn-l').textContent,
      hud: el('lvltxt').textContent }));
    t.eq(shown.level, boundary.lv, 'the level goes up');
    t.ok(shown.on, 'and the banner appears');
    t.eq(shown.title, boundary.name, 'showing the new title');
    t.eq(shown.line, boundary.line, 'and its line');
    t.ok(shown.kicker.includes(String(boundary.lv)), 'with the level in the kicker');
    t.ok(shown.hud.includes(boundary.name), 'the bottom bar shows the title too');

    /* It goes away by itself. */
    await t.tick(7);
    t.ok(!(await t.get(()=>el('banner').classList.contains('on'))), 'the banner clears itself');

    /* A level-up between ranks shows nothing. */
    await t.run(()=>{ G.earned = levelReq(G.level); checkLevel(); });
    const between = await t.get(()=>({ on: el('banner').classList.contains('on'), level: G.level }));
    t.ok(!between.on, 'an ordinary level-up does not interrupt the player');

    /* Loading a save must never fire one. */
    await t.run(()=>{ el('banner').classList.remove('on'); bannerT = 0;
                      const d = saveData(); d.earned = levelReq(60); applySave(sanitiseSave(d)); });
    const loaded = await t.get(()=>({ level: G.level, on: el('banner').classList.contains('on') }));
    t.gt(loaded.level, 50, 'loading a big save jumps many levels');
    t.ok(!loaded.on, 'and shows no banner for any of them');

    /* The menu. */
    await t.run(()=>{ G.level = 1; G.earned = 0; syncHUD(); openRanks(); });
    const menu = await t.get(()=>({
      rows: document.querySelectorAll('#ranks .rr').length,
      cur: document.querySelectorAll('.rr.cur').length,
      locked: document.querySelectorAll('.rr.lock').length,
      next: el('rnext').textContent,
      firstRow: document.querySelector('.rr').textContent,
    }));
    t.eq(menu.rows, ladder.ranks.length, 'the menu lists every rank');
    t.eq(menu.cur, 1, 'exactly one is marked as where you are');
    t.eq(menu.locked, ladder.ranks.length - 1, 'the rest are locked at level 1');
    t.ok(menu.next.includes('$'), 'it says what the next level costs');
    t.ok(menu.firstRow.includes(ladder.ranks[0].name), 'and starts at the bottom of the ladder');

    /* At the top there is no next rank to name -- that must not throw. */
    await t.run(()=>{ closeModal(); G.level = 99999; G.earned = levelReq(99998); syncHUD(); openRanks(); });
    const maxed = await t.get(()=>({ locked: document.querySelectorAll('.rr.lock').length,
                                     next: el('rnext').textContent,
                                     hud: el('lvltxt').textContent }));
    t.eq(maxed.locked, 0, 'nothing is locked once you are at the top');
    t.ok(maxed.next.length > 0, 'and the menu still has something to say');
    t.ok(maxed.hud.includes(ladder.top), 'the bar shows the highest title');
  }
};
