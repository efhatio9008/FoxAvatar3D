'use strict';
// Fox Avatar background music (V0.5.4): user-supplied 1.mp3.
// There is deliberately no visible audio control, and it loops continuously.
// Browsers may block audible autoplay until the visitor first interacts.
(() => {
  const music = document.getElementById('site-bgm');
  if (!music) return;

  music.loop = true;
  music.volume = 1.0; // Maximum HTML media volume; device volume remains user-controlled.

  function tryPlay() {
    if (!music.paused) return;
    const result = music.play();
    if (result && typeof result.catch === 'function') {
      // NotAllowedError is normal on browsers that block audible autoplay.
      // In that case, retry directly on the visitor's first page interaction.
      result.catch(() => {});
    }
  }

  // Play immediately in browsers that allow audible autoplay.
  tryPlay();

  // On mobile or stricter desktop settings, start on the first tap/interaction
  // anywhere on the page. No new button or music UI is added.
  for (const type of ['pointerdown', 'touchstart', 'keydown', 'click']) {
    window.addEventListener(type, tryPlay, { capture: true, passive: true });
  }

  // Resume when returning to a paused tab or restoring the page from cache.
  window.addEventListener('pageshow', tryPlay);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryPlay();
  });
})();
