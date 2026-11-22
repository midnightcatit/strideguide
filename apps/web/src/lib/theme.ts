export type Theme = 'light' | 'dark' | 'system';

const KEY = 'sg-theme';

export function getTheme(): Theme {
	if (typeof localStorage === 'undefined') return 'system';
	const t = localStorage.getItem(KEY);
	return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
}

export function applyTheme(theme: Theme): void {
	if (typeof document === 'undefined') return;
	if (theme === 'system') {
		delete document.documentElement.dataset.theme;
	} else {
		document.documentElement.dataset.theme = theme;
	}
	localStorage.setItem(KEY, theme);
}

export function cycleTheme(): Theme {
	const current = getTheme();
	const next: Theme = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
	applyTheme(next);
	return next;
}
