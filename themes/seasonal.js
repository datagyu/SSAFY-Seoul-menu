/* Reuse the theme by changing this schedule. End is exclusive, in Korea time. */
(() => {
  const schedule = {
    theme: 'autumn',
    start: '2026-10-18T00:00:00+09:00',
    end: '2026-11-18T00:00:00+09:00',
  };
  const preview = new URLSearchParams(location.search).get('theme');
  function applyTheme() {
    const now = Date.now();
    const active = preview === 'autumn' || (preview !== 'default' &&
      now >= Date.parse(schedule.start) && now < Date.parse(schedule.end));
    if (active) document.documentElement.dataset.theme = schedule.theme;
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', active ? '#F6EBDD' : '#F7F5EF');
  }
  applyTheme();
  // Also restore pages left open across the end of the campaign.
  setInterval(applyTheme, 60000);
  document.addEventListener('visibilitychange', applyTheme);
})();
