import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { googleRoutesService, RouteWaypointInput } from '../../src/services/google-routes.service.js';

describe('GoogleRoutesService — Cost-Optimized Routing System', () => {
  beforeEach(() => {
    googleRoutesService.resetForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Deterministic Sequence Fingerprinting', () => {
    it('should generate identical fingerprints for the same depot and ordered stops', () => {
      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567, address: 'FC Road, Pune' },
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445, address: 'Shivaji Nagar, Pune' },
      ];

      const fp1 = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stops);
      const fp2 = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stops);

      expect(fp1).toBe(fp2);
      expect(typeof fp1).toBe('string');
      expect(fp1.length).toBe(32);
    });

    it('should produce a different fingerprint when stop order is inverted', () => {
      const stopsA: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445 },
      ];
      const stopsB: RouteWaypointInput[] = [
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445 },
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
      ];

      const fpA = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stopsA);
      const fpB = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stopsB);

      expect(fpA).not.toBe(fpB);
    });

    it('should produce a different fingerprint when a stop is added or removed', () => {
      const stops2: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445 },
      ];
      const stops3: RouteWaypointInput[] = [
        ...stops2,
        { shopId: 'shop-3', latitude: 18.5089, longitude: 73.8321 },
      ];

      const fp2 = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stops2);
      const fp3 = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stops3);

      expect(fp2).not.toBe(fp3);
    });

    it('should produce a different fingerprint when depot changes', () => {
      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
      ];

      const fpDepot1 = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stops);
      const fpDepot2 = googleRoutesService.computeFingerprint('Mumbai Central Hub', stops);

      expect(fpDepot1).not.toBe(fpDepot2);
    });
  });

  describe('Zero-API-Call Cache Reuse', () => {
    it('should reuse valid existing results when fingerprint matches without calling Google API', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445 },
      ];

      const matchingFingerprint = googleRoutesService.computeFingerprint('Pune Central Cold Depot', stops);

      const result = await googleRoutesService.calculateRouteDistance({
        depot: 'Pune Central Cold Depot',
        stops,
        feature: 'ROUTE_STOPS_UPDATE',
        existingFingerprint: matchingFingerprint,
        existingDistanceKm: 14.8,
      });

      expect(result).not.toBeNull();
      expect(result?.distanceKm).toBe(14.8);
      expect(result?.source).toBe('cache');
      expect(fetchSpy).not.toHaveBeenCalled();

      const metrics = googleRoutesService.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.totalGoogleRequests).toBe(0);
    });
  });

  describe('In-Flight Request Concurrency Deduplication', () => {
    it('should deduplicate concurrent requests for the same route and trigger only 1 Google API call', async () => {
      vi.spyOn(googleRoutesService, 'getApiKey').mockReturnValue('AIzaSyMockedKeyForTesting123');

      let fetchCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        fetchCallCount++;
        // Simulate 40ms network latency
        await new Promise((r) => setTimeout(r, 40));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            routes: [
              {
                distanceMeters: 18500,
                duration: '1500s',
              },
            ],
          }),
        } as any;
      });

      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445 },
      ];

      // Fire 4 simultaneous calls for the exact same route
      const [res1, res2, res3, res4] = await Promise.all([
        googleRoutesService.calculateRouteDistance({
          depot: 'Pune Central Cold Depot',
          stops,
          feature: 'ROUTE_CREATION',
        }),
        googleRoutesService.calculateRouteDistance({
          depot: 'Pune Central Cold Depot',
          stops,
          feature: 'ROUTE_CREATION',
        }),
        googleRoutesService.calculateRouteDistance({
          depot: 'Pune Central Cold Depot',
          stops,
          feature: 'ROUTE_CREATION',
        }),
        googleRoutesService.calculateRouteDistance({
          depot: 'Pune Central Cold Depot',
          stops,
          feature: 'ROUTE_CREATION',
        }),
      ]);

      expect(fetchCallCount).toBe(1);
      expect(res1?.distanceKm).toBe(18.5);
      expect(res2?.distanceKm).toBe(18.5);
      expect(res3?.distanceKm).toBe(18.5);
      expect(res4?.distanceKm).toBe(18.5);

      const metrics = googleRoutesService.getMetrics();
      expect(metrics.totalGoogleRequests).toBe(1);
      expect(metrics.deduplicatedRequests).toBe(3);
    });
  });

  describe('Minimal Billable Payload & Field Mask Compliance', () => {
    it('should request strictly routes.distanceMeters,routes.duration and TRAFFIC_UNAWARE preference', async () => {
      vi.spyOn(googleRoutesService, 'getApiKey').mockReturnValue('AIzaSyMockedKeyForTesting123');

      let capturedHeaders: any = null;
      let capturedBody: any = null;

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options: any) => {
        capturedHeaders = options.headers;
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            routes: [{ distanceMeters: 12400, duration: '1200s' }],
          }),
        } as any;
      });

      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
        { shopId: 'shop-2', latitude: 18.5312, longitude: 73.8445 },
        { shopId: 'shop-3', latitude: 18.5501, longitude: 73.8112 },
      ];

      const result = await googleRoutesService.calculateRouteDistance({
        depot: 'Pune Central Cold Depot',
        stops,
        feature: 'ROUTE_CREATION',
      });

      expect(result?.distanceKm).toBe(12.4);
      expect(result?.durationMinutes).toBe(20);

      // Verify minimal billable field mask
      expect(capturedHeaders['X-Goog-FieldMask']).toBe('routes.distanceMeters,routes.duration');
      expect(capturedHeaders['X-Goog-Api-Key']).toBe('AIzaSyMockedKeyForTesting123');

      // Verify Routes Essentials routing tier
      expect(capturedBody.routingPreference).toBe('TRAFFIC_UNAWARE');
      expect(capturedBody.travelMode).toBe('DRIVE');

      // Verify ordered sequence: origin is depot, intermediates has stop 1 and 2, destination is stop 3
      expect(capturedBody.origin.location.latLng.latitude).toBe(18.5204);
      expect(capturedBody.intermediates.length).toBe(2);
      expect(capturedBody.destination.location.latLng.latitude).toBe(18.5501);
    });
  });

  describe('Resilient Failure & Retry Handling', () => {
    it('should retry once on transient 503 and succeed on second attempt', async () => {
      vi.spyOn(googleRoutesService, 'getApiKey').mockReturnValue('AIzaSyMockedKeyForTesting123');

      let attempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        attempts++;
        if (attempts === 1) {
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({ error: { message: 'Overloaded' } }),
          } as any;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            routes: [{ distanceMeters: 9200, duration: '900s' }],
          }),
        } as any;
      });

      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
      ];

      const result = await googleRoutesService.calculateRouteDistance({
        depot: 'Pune Central Cold Depot',
        stops,
        feature: 'ROUTE_CREATION',
      });

      expect(attempts).toBe(2);
      expect(result?.distanceKm).toBe(9.2);

      const metrics = googleRoutesService.getMetrics();
      expect(metrics.retriesAttempted).toBe(1);
      expect(metrics.totalGoogleRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should NOT retry on 4xx permanent client errors (e.g. 403 Invalid API Key / Quota)', async () => {
      vi.spyOn(googleRoutesService, 'getApiKey').mockReturnValue('AIzaSyMockedKeyForTesting123');

      let attempts = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        attempts++;
        return {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: { message: 'API key expired or invalid' } }),
        } as any;
      });

      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
      ];

      const result = await googleRoutesService.calculateRouteDistance({
        depot: 'Pune Central Cold Depot',
        stops,
        feature: 'ROUTE_CREATION',
      });

      expect(attempts).toBe(1); // Exactly 1 attempt, zero retries
      expect(result).toBeNull();

      const metrics = googleRoutesService.getMetrics();
      expect(metrics.retriesAttempted).toBe(0);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should return null safely without throwing when API key is missing', async () => {
      vi.spyOn(googleRoutesService, 'getApiKey').mockReturnValue(undefined);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
      ];

      const result = await googleRoutesService.calculateRouteDistance({
        depot: 'Pune Central Cold Depot',
        stops,
        feature: 'ROUTE_CREATION',
      });

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Cost and Metrics Monitoring', () => {
    it('should calculate estimated cost correctly at $0.005 per request', async () => {
      vi.spyOn(googleRoutesService, 'getApiKey').mockReturnValue('AIzaSyMockedKeyForTesting123');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          routes: [{ distanceMeters: 10000, duration: '1000s' }],
        }),
      } as any);

      const stops: RouteWaypointInput[] = [
        { shopId: 'shop-1', latitude: 18.5204, longitude: 73.8567 },
      ];

      await googleRoutesService.calculateRouteDistance({
        depot: 'Pune Central Cold Depot',
        stops,
        feature: 'MANUAL_RECALCULATION',
        forceRecalculate: true,
      });

      const metrics = googleRoutesService.getMetrics();
      expect(metrics.totalGoogleRequests).toBe(1);
      expect(metrics.features.MANUAL_RECALCULATION).toBe(1);
      expect(metrics.estimatedCostUsd).toBe(0.005);
      expect(metrics.lastRequestAt).not.toBeNull();
    });
  });
});
