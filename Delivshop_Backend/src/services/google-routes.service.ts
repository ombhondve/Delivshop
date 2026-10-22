import crypto from 'crypto';
import { ENV } from '../config/env.js';

export interface RouteWaypointInput {
  shopId?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
}

export interface RoutingResult {
  distanceKm: number;
  durationMinutes: number;
  fingerprint: string;
  source: 'google_api' | 'cache' | 'in_flight_dedup';
}

export type RoutingFeature = 'ROUTE_CREATION' | 'ROUTE_STOPS_UPDATE' | 'MANUAL_RECALCULATION';

interface CacheEntry {
  result: RoutingResult;
  timestamp: number;
}

// Known depot coordinates to avoid redundant geocoding
const KNOWN_DEPOT_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'pune central cold depot': { latitude: 18.5204, longitude: 73.8567 },
  'central hub': { latitude: 18.5204, longitude: 73.8567 },
  'mumbai central hub': { latitude: 19.076, longitude: 72.8777 },
  'nashik cold depot': { latitude: 19.9975, longitude: 73.7898 },
};

// 30 days cache retention in milliseconds (Google Maps Platform compliant)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

class GoogleRoutesService {
  private inFlightRequests = new Map<string, Promise<RoutingResult | null>>();
  private memoryCache = new Map<string, CacheEntry>();

  private metrics = {
    totalGoogleRequests: 0,
    cacheHits: 0,
    deduplicatedRequests: 0,
    failedRequests: 0,
    retriesAttempted: 0,
    features: {
      ROUTE_CREATION: 0,
      ROUTE_STOPS_UPDATE: 0,
      MANUAL_RECALCULATION: 0,
    } as Record<RoutingFeature, number>,
    estimatedCostUsd: 0,
    lastRequestAt: null as string | null,
  };

  /**
   * Resolve configured Google Routes API key from environment variables.
   * Checks GOOGLE_ROUTES_API_KEY first, then GOOGLE_MAPS_API_KEY.
   */
  public getApiKey(): string | undefined {
    return (
      ENV.GOOGLE_ROUTES_API_KEY ||
      process.env.GOOGLE_ROUTES_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      undefined
    );
  }

  /**
   * Deterministic fingerprint computation based on depot, start/return locations, and ordered sequence of stops.
   * Any change in stops, coordinates, or order changes the hash.
   */
  public computeFingerprint(
    depot: string,
    stops: RouteWaypointInput[],
    startLocation?: { latitude?: number | null; longitude?: number | null; address?: string | null } | null,
    returnLocation?: { latitude?: number | null; longitude?: number | null; address?: string | null } | null
  ): string {
    const normDepot = (depot || '').trim().toLowerCase();
    const startStr = startLocation
      ? `${startLocation.latitude != null ? Number(startLocation.latitude).toFixed(5) : ''},${startLocation.longitude != null ? Number(startLocation.longitude).toFixed(5) : ''}:${(startLocation.address || '').trim().toLowerCase()}`
      : '';
    const returnStr = returnLocation
      ? `${returnLocation.latitude != null ? Number(returnLocation.latitude).toFixed(5) : ''},${returnLocation.longitude != null ? Number(returnLocation.longitude).toFixed(5) : ''}:${(returnLocation.address || '').trim().toLowerCase()}`
      : '';
    const stopsFingerprint = stops.map((s, idx) => {
      const lat = s.latitude !== undefined && s.latitude !== null ? Number(s.latitude).toFixed(5) : '';
      const lng = s.longitude !== undefined && s.longitude !== null ? Number(s.longitude).toFixed(5) : '';
      const addr = (s.address || '').trim().toLowerCase();
      const shopId = (s.shopId || '').trim();
      return `${idx}:${shopId}:${lat},${lng}:${addr}`;
    });

    return crypto
      .createHash('sha256')
      .update([normDepot, startStr, returnStr, ...stopsFingerprint].join('|'))
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Convert an internal waypoint or depot string into a Google Routes API v2 Waypoint object.
   */
  private formatGoogleWaypoint(
    item: { latitude?: number | null; longitude?: number | null; address?: string | null; city?: string | null } | string
  ): any | null {
    if (typeof item === 'string') {
      const norm = item.trim().toLowerCase();
      const known = KNOWN_DEPOT_COORDINATES[norm];
      if (known) {
        return {
          location: {
            latLng: {
              latitude: known.latitude,
              longitude: known.longitude,
            },
          },
        };
      }
      return { address: item };
    }

    if (
      item.latitude !== undefined &&
      item.latitude !== null &&
      item.longitude !== undefined &&
      item.longitude !== null &&
      !isNaN(Number(item.latitude)) &&
      !isNaN(Number(item.longitude))
    ) {
      return {
        location: {
          latLng: {
            latitude: Number(item.latitude),
            longitude: Number(item.longitude),
          },
        },
      };
    }

    if (item.address && item.address.trim().length > 0) {
      const fullAddress = item.city && !item.address.toLowerCase().includes(item.city.toLowerCase())
        ? `${item.address.trim()}, ${item.city.trim()}`
        : item.address.trim();
      return { address: fullAddress };
    }

    return null;
  }

  /**
   * Calculate driving distance and duration for an ordered sequence of delivery stops.
   * Centralized single entry point for Google Routes API requests.
   */
  public async calculateRouteDistance(params: {
    depot: string;
    stops: RouteWaypointInput[];
    feature: RoutingFeature;
    startLocation?: { latitude?: number | null; longitude?: number | null; address?: string | null } | null;
    returnLocation?: { latitude?: number | null; longitude?: number | null; address?: string | null } | null;
    existingFingerprint?: string | null;
    existingDistanceKm?: number | null;
    forceRecalculate?: boolean;
  }): Promise<RoutingResult | null> {
    const { depot, stops, feature, startLocation, returnLocation, existingFingerprint, existingDistanceKm, forceRecalculate } = params;

    if (!stops || stops.length === 0) {
      return null;
    }

    // 1. Generate fingerprint for this ordered sequence
    const fingerprint = this.computeFingerprint(depot, stops, startLocation, returnLocation);

    // 2. Reuse check: If not forced and existing fingerprint matches with valid distance, reuse without API call
    if (
      !forceRecalculate &&
      existingFingerprint &&
      existingFingerprint === fingerprint &&
      existingDistanceKm !== undefined &&
      existingDistanceKm !== null &&
      Number(existingDistanceKm) > 0
    ) {
      this.metrics.cacheHits++;
      return {
        distanceKm: Number(existingDistanceKm),
        durationMinutes: 0, // already in db
        fingerprint,
        source: 'cache',
      };
    }

    // 3. Memory cache check
    const cached = this.memoryCache.get(fingerprint);
    if (!forceRecalculate && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      this.metrics.cacheHits++;
      return {
        ...cached.result,
        source: 'cache',
      };
    }

    // 4. In-flight request deduplication:
    // If a request for this exact fingerprint is currently executing, reuse the promise to prevent duplicate API billing
    if (this.inFlightRequests.has(fingerprint)) {
      this.metrics.deduplicatedRequests++;
      return this.inFlightRequests.get(fingerprint)!;
    }

    // 5. Check if Google Routes API key is configured
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn(
        `[GoogleRoutesService] GOOGLE_ROUTES_API_KEY not configured. Skipping external road calculation for feature "${feature}".`
      );
      return null;
    }

    // 6. Build the execution promise
    const executionPromise = (async () => {
      try {
        const result = await this.executeRoutesApiRequest(depot, stops, apiKey, fingerprint, feature, startLocation, returnLocation);
        if (result) {
          this.memoryCache.set(fingerprint, { result, timestamp: Date.now() });
        }
        return result;
      } finally {
        this.inFlightRequests.delete(fingerprint);
      }
    })();

    this.inFlightRequests.set(fingerprint, executionPromise);
    return executionPromise;
  }

  /**
   * Execute the HTTP request to Google Routes API v2 computeRoutes with retry policy and minimal field mask.
   */
  private async executeRoutesApiRequest(
    depot: string,
    stops: RouteWaypointInput[],
    apiKey: string,
    fingerprint: string,
    feature: RoutingFeature,
    startLocation?: { latitude?: number | null; longitude?: number | null; address?: string | null } | null,
    returnLocation?: { latitude?: number | null; longitude?: number | null; address?: string | null } | null
  ): Promise<RoutingResult | null> {
    // Determine origin, intermediates, and destination
    // Origin is Start Location if provided, otherwise depot
    const originWaypoint = startLocation
      ? this.formatGoogleWaypoint(startLocation)
      : this.formatGoogleWaypoint(depot);
    
    // Return Location waypoint if configured
    const returnWaypoint = returnLocation ? this.formatGoogleWaypoint(returnLocation) : null;
    const stopWaypoints = stops.map((s) => this.formatGoogleWaypoint(s)).filter(Boolean);

    if (stopWaypoints.length === 0 && !returnWaypoint) {
      return null;
    }

    let origin: any;
    let destination: any;
    let intermediates: any[] = [];

    if (originWaypoint) {
      origin = originWaypoint;
      if (returnWaypoint) {
        // Full loop: Start Location -> All Stops -> Return Location
        destination = returnWaypoint;
        intermediates = stopWaypoints;
      } else {
        // No return point: Start Location -> Intermediates -> Final Stop
        destination = stopWaypoints[stopWaypoints.length - 1];
        intermediates = stopWaypoints.slice(0, stopWaypoints.length - 1);
      }
    } else {
      if (returnWaypoint) {
        origin = stopWaypoints[0];
        destination = returnWaypoint;
        intermediates = stopWaypoints.slice(1);
      } else {
        if (stopWaypoints.length === 1) {
          return null;
        }
        origin = stopWaypoints[0];
        destination = stopWaypoints[stopWaypoints.length - 1];
        intermediates = stopWaypoints.slice(1, stopWaypoints.length - 1);
      }
    }

    const payload = {
      origin,
      destination,
      intermediates: intermediates.length > 0 ? intermediates : undefined,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE', // Routes Essentials tier (most cost-effective)
    };

    const maxRetries = 1;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        attempt++;
        this.metrics.totalGoogleRequests++;
        this.metrics.features[feature] = (this.metrics.features[feature] || 0) + 1;
        this.metrics.estimatedCostUsd = Number((this.metrics.totalGoogleRequests * 0.005).toFixed(4));
        this.metrics.lastRequestAt = new Date().toISOString();

        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            // Minimal billable field mask: distance and duration ONLY
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          let errorDetail = '';
          try {
            const errJson = (await response.json()) as any;
            errorDetail = errJson?.error?.message || response.statusText;
          } catch {
            errorDetail = response.statusText;
          }

          // Do NOT retry 4xx errors (client errors, bad request, auth, billing, quota)
          if (status >= 400 && status < 500) {
            console.error(`[GoogleRoutesService] Permanent API error (HTTP ${status}): ${errorDetail}`);
            this.metrics.failedRequests++;
            return null;
          }

          // 5xx Server errors: retry if attempts remaining
          if (attempt <= maxRetries) {
            this.metrics.retriesAttempted++;
            console.warn(`[GoogleRoutesService] Transient error (HTTP ${status}). Retrying once in 500ms...`);
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }

          console.error(`[GoogleRoutesService] Failed after retries (HTTP ${status}): ${errorDetail}`);
          this.metrics.failedRequests++;
          return null;
        }

        const data = (await response.json()) as any;
        const route = data?.routes?.[0];

        if (!route) {
          console.warn('[GoogleRoutesService] No route returned by Google Routes API.');
          return null;
        }

        const distanceMeters = Number(route.distanceMeters) || 0;
        const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;

        let durationSeconds = 0;
        if (typeof route.duration === 'string') {
          durationSeconds = parseInt(route.duration.replace('s', ''), 10) || 0;
        } else if (typeof route.duration === 'number') {
          durationSeconds = route.duration;
        }
        const durationMinutes = Math.round(durationSeconds / 60);

        console.info(
          `[GoogleRoutesService] Successfully calculated road distance: ${distanceKm} km, ~${durationMinutes} mins (${feature}).`
        );

        return {
          distanceKm,
          durationMinutes,
          fingerprint,
          source: 'google_api',
        };
      } catch (err: any) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
          console.warn('[GoogleRoutesService] Request timed out (8000ms).');
        } else {
          console.error('[GoogleRoutesService] Network or unexpected error:', err.message);
        }

        if (attempt <= maxRetries) {
          this.metrics.retriesAttempted++;
          console.warn('[GoogleRoutesService] Retrying once after network/timeout failure in 500ms...');
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        this.metrics.failedRequests++;
        return null;
      }
    }

    return null;
  }

  /**
   * Return real-time cost and request monitoring metrics.
   */
  public getMetrics() {
    return {
      ...this.metrics,
      activeInFlightCount: this.inFlightRequests.size,
      memoryCacheSize: this.memoryCache.size,
    };
  }

  /**
   * Reset metrics and caches (useful for automated testing).
   */
  public resetForTesting() {
    this.inFlightRequests.clear();
    this.memoryCache.clear();
    this.metrics = {
      totalGoogleRequests: 0,
      cacheHits: 0,
      deduplicatedRequests: 0,
      failedRequests: 0,
      retriesAttempted: 0,
      features: {
        ROUTE_CREATION: 0,
        ROUTE_STOPS_UPDATE: 0,
        MANUAL_RECALCULATION: 0,
      },
      estimatedCostUsd: 0,
      lastRequestAt: null,
    };
  }
}

export const googleRoutesService = new GoogleRoutesService();
