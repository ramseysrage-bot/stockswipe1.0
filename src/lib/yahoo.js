const CORS_PROXY = 'https://api.allorigins.win/raw?url='

export async function fetchWithFallback(url) {
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error('direct failed')
    return await r.json()
  } catch {
    const r = await fetch(CORS_PROXY + encodeURIComponent(url))
    if (!r.ok) throw new Error('proxy failed')
    return await r.json()
  }
}
