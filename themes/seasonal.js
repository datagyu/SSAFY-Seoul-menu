/* Theme dates use Korea time. Each end is exclusive. */
(() => {
  const seasons = [
    {
      name: 'autumn',
      color: '#F6EBDD',
      start: Date.parse('2026-10-18T00:00:00+09:00'),
      end: Date.parse('2026-11-18T00:00:00+09:00'),
    },
    {
      name: 'winter',
      color: '#E5F1FA',
      start: Date.parse('2026-12-01T00:00:00+09:00'),
      end: Date.parse('2027-03-01T00:00:00+09:00'),
    },
  ];
  const preview = new URLSearchParams(location.search).get('theme');
  const previewTheme = seasons.find(season => season.name === preview);

  function applyTheme() {
    const now = Date.now();
    const active = previewTheme ?? (preview === 'default' ? undefined :
      seasons.find(season => now >= season.start && now < season.end));
    if (active) document.documentElement.dataset.theme = active.name;
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', active?.color ?? '#F7F5EF');
  }
  applyTheme();
  // Update pages left open across a season boundary.
  setInterval(applyTheme, 60000);
  document.addEventListener('visibilitychange', applyTheme);
})();
