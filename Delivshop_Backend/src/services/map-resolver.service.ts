import { URL } from 'url';

export interface ResolvedCoordinates {
  latitude: number;
  longitude: number;
  canonicalUrl?: string;
  source: 'direct' | 'url_extracted' | 'url_resolved';
}

const ALLOWED_MAP_DOMAINS = [
  'maps.google.com',
  'www.google.com',
  'google.com',
  'maps.app.goo.gl',
  'goo.gl',
  'maps.google.co.in',
  'www.google.co.in',
];

/**
 * Validate that a URL is strictly a Google Maps URL and safe against SSRF attacks.
 */
export function isAllowedGoogleMapsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Prevent loopback, private ranges, and non-whitelisted domains
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.')
    ) {
      return false;
    }

    // Check if domain is in allowed list or is a subdomain of google.com/google.co.in
    const isAllowed = ALLOWED_MAP_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    return isAllowed;
  } catch {
    return false;
  }
}

/**
 * Extract latitude and longitude from standard Google Maps URL patterns.
 */
export function extractCoordinatesFromUrl(urlString: string): { latitude: number; longitude: number } | null {
  // Pattern 1: /@20.005882,73.789764, or /@20.005882,73.789764z
  const atMatch = urlString.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 2: q=20.005882,73.789764 or query=20.005882,73.789764 or ll=20.005882,73.789764
  const queryMatch = urlString.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // Pattern 3: Protobuf encoded coordinates in Google Maps URLs (!3d20.005882!4d73.789764)
  const protoMatch = urlString.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (protoMatch) {
    const lat = parseFloat(protoMatch[1]);
    const lng = parseFloat(protoMatch[2]);
    if (isValidCoordinate(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90.0 &&
    latitude <= 90.0 &&
    longitude >= -180.0 &&
    longitude <= 180.0
  );
}

/**
 * Resolve a Google Maps URL (including short links like maps.app.goo.gl) server-side safely.
 * Implements strict SSRF protection, manual redirect following, and domain validation.
 */
export async function resolveGoogleMapsUrl(mapUrl: string): Promise<ResolvedCoordinates> {
  const trimmed = mapUrl.trim();

  if (!isAllowedGoogleMapsUrl(trimmed)) {
    throw new Error('Invalid or unsupported map link. Only verified Google Maps URLs are allowed.');
  }

  // First try direct extraction
  const direct = extractCoordinatesFromUrl(trimmed);
  if (direct) {
    return {
      latitude: direct.latitude,
      longitude: direct.longitude,
      canonicalUrl: trimmed,
      source: 'url_extracted',
    };
  }

  // Follow short redirect (e.g. maps.app.goo.gl or goo.gl/maps)
  let currentUrl = trimmed;
  let redirectsFollowed = 0;
  const maxRedirects = 3;

  while (redirectsFollowed < maxRedirects) {
    if (!isAllowedGoogleMapsUrl(currentUrl)) {
      throw new Error('Redirected to an unauthorized external domain.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      clearTimeout(timeoutId);

      // Check for redirect location
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) break;

        const resolvedLocation = new URL(location, currentUrl).toString();
        currentUrl = resolvedLocation;
        redirectsFollowed++;

        // Check if redirect URL contains coordinates
        const coords = extractCoordinatesFromUrl(currentUrl);
        if (coords) {
          return {
            latitude: coords.latitude,
            longitude: coords.longitude,
            canonicalUrl: currentUrl,
            source: 'url_resolved',
          };
        }
      } else {
        break;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Map resolution timed out.');
      }
      break;
    }
  }

  // Final attempt on latest resolved URL
  const finalCoords = extractCoordinatesFromUrl(currentUrl);
  if (finalCoords) {
    return {
      latitude: finalCoords.latitude,
      longitude: finalCoords.longitude,
      canonicalUrl: currentUrl,
      source: 'url_resolved',
    };
  }

  throw new Error('Could not extract coordinates from the provided Google Maps link. Please specify coordinates or use the map picker.');
}

/**
 * Calculate geographical distance in metres between two coordinates using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

