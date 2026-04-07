const THEME_KEY = 'staexoctor_theme_mode';

export function getSavedThemeMode() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

export function saveThemeMode(mode) {
  localStorage.setItem(THEME_KEY, mode);
}

export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(mode) {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return getSystemTheme();
}

export function applyTheme(mode) {
  const finalTheme = resolveTheme(mode);
  document.documentElement.setAttribute('data-theme', finalTheme);
  document.documentElement.setAttribute('data-theme-mode', mode);
}

export function initTheme() {
  const mode = getSavedThemeMode();
  applyTheme(mode);
  return mode;
}

export function watchSystemThemeChange(callback) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = () => {
    const mode = getSavedThemeMode();
    if (mode === 'system') {
      applyTheme('system');
      callback?.('system');
    }
  };

  if (media.addEventListener) {
    media.addEventListener('change', handler);
  } else {
    media.addListener(handler);
  }

  return () => {
    if (media.removeEventListener) {
      media.removeEventListener('change', handler);
    } else {
      media.removeListener(handler);
    }
  };
}
