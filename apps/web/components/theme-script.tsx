import Script from 'next/script';

const themeBootstrapScript = `(() => {
  const storageKey = 'opentournament-theme';
  const root = document.documentElement;
  let preference = 'system';

  try {
    const storedPreference = window.localStorage.getItem(storageKey);
    if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
      preference = storedPreference;
    }
  } catch {}

  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedTheme = preference === 'system'
    ? (prefersDarkMode ? 'dark' : 'light')
    : preference;

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
})();`;

export function ThemeScript() {
  return (
    <Script
      id="opentournament-theme-bootstrap"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
    />
  );
}
