export function resolveBffBaseUrl(value: string | undefined): string {
  const base = value === undefined ? '/bff' : value.trim()
  const invalid = () => new Error('VITE_BFF_BASE_URL inválida. Configure o endereço HTTP(S) ou um caminho da mesma origem.')
  if (!base || /[\\\s?#]/.test(base)) throw invalid()
  if (base.startsWith('/') && !base.startsWith('//')) {
    if (!/^\/[a-zA-Z0-9/_-]*$/.test(base) || base.includes('//')) throw invalid()
    return base.replace(/\/$/, '')
  }
  let url: URL
  try { url = new URL(base) } catch { throw invalid() }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
    || base.includes('/../') || base.includes('/./') || /%/i.test(url.pathname)) throw invalid()
  return url.href.replace(/\/$/, '')
}
