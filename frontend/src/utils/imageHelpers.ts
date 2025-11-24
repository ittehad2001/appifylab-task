export function getFullImageUrl(path?: string | null): string {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const base = apiBase.replace('/api', '').replace(/\/$/, '');

  let clean = path.startsWith('/') ? path : `/${path}`;

  clean = clean.replace('/public/', '/storage/');
  clean = clean.replace('/storage/', '/storage/');

  return `${base}${clean}`;
}
