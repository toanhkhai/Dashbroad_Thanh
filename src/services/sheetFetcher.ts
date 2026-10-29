import { getSheetFetchUrls } from '../config/sheets';

/**
 * Fetches raw CSV data for a specific sheet gid.
 * Dual-strategy:
 * 1. Tries local proxy (/api/sheet?gid=...) first (no CORS, works on school server and Vite dev)
 * 2. Falls back to direct Google Sheets export if proxy is unavailable
 * Always uses cache: 'no-store' and cache-busting timestamp to ensure freshest data.
 */
export async function fetchSheetCsv(gid: string): Promise<string> {
  const { proxyUrl, directUrl } = getSheetFetchUrls(gid);

  // Strategy 1: Proxy
  try {
    const res = await fetch(proxyUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
    });

    if (res.ok) {
      const text = await res.text();
      // Verify it returned valid CSV (not an HTML error page)
      if (text.includes('BẢNG THỐNG KÊ') || text.includes('STT') || text.includes(',')) {
        return text;
      }
    }
  } catch (proxyErr) {
    console.warn(`Proxy fetch failed for gid ${gid}, trying direct fallback...`, proxyErr);
  }

  // Strategy 2: Direct Google Export
  try {
    const res = await fetch(directUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      },
    });

    if (!res.ok) {
      throw new Error(`Google Sheets export returned HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    return text;
  } catch (directErr: any) {
    throw new Error(`Failed to fetch sheet (gid: ${gid}): ${directErr?.message || directErr}`);
  }
}
