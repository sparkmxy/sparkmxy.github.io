const CHINESE_REGIONS = new Set(['CN','HK','TW','MO']);
export function languageForCountry(country) {
  return typeof country==='string' && /^[A-Z]{2}$/.test(country) && country!=='XX'
    ? CHINESE_REGIONS.has(country)?'zh':'en' : null;
}
export function browserLanguage(languages=globalThis.navigator?.languages||[]) {
  return /^zh(?:-|$)/i.test(languages[0]||'') ? 'zh' : 'en';
}
export function storedLanguage(storage) {
  try { const value=storage.getItem('tarot-language'); return ['zh','en'].includes(value)?value:null; } catch { return null; }
}
export async function lookupCountry({fetchImpl=fetch,signal,timeoutMs=4500}={}) {
  try {
    const response=await fetchImpl('https://api.country.is/', {method:'GET',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',
      signal:AbortSignal.any([AbortSignal.timeout(timeoutMs),...(signal?[signal]:[])])});
    if(!response.ok) return null;
    const {country}=await response.json();
    return languageForCountry(country) ? country : null;
  } catch { return null; }
}
