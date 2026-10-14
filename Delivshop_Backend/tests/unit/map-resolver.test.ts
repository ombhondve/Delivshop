import { describe, it, expect } from 'vitest';
import {
  isAllowedGoogleMapsUrl,
  extractCoordinatesFromUrl,
  isValidCoordinate,
} from '../../src/services/map-resolver.service.js';

describe('Google Maps Resolver & SSRF Security', () => {
  it('should accept valid Google Maps domains', () => {
    expect(isAllowedGoogleMapsUrl('https://maps.google.com/?q=20.005882,73.789764')).toBe(true);
    expect(isAllowedGoogleMapsUrl('https://www.google.com/maps/place/Nashik/@20.005882,73.789764,15z')).toBe(true);
    expect(isAllowedGoogleMapsUrl('https://maps.app.goo.gl/abcdef123')).toBe(true);
    expect(isAllowedGoogleMapsUrl('https://goo.gl/maps/xyz987')).toBe(true);
  });

  it('should reject internal SSRF targets and unauthorized domains', () => {
    expect(isAllowedGoogleMapsUrl('http://localhost:5000/api/keys')).toBe(false);
    expect(isAllowedGoogleMapsUrl('http://127.0.0.1:8080')).toBe(false);
    expect(isAllowedGoogleMapsUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedGoogleMapsUrl('http://192.168.1.1/admin')).toBe(false);
    expect(isAllowedGoogleMapsUrl('https://evil-attacker-site.com/maps')).toBe(false);
    expect(isAllowedGoogleMapsUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedGoogleMapsUrl('file:///etc/passwd')).toBe(false);
  });

  it('should accurately extract coordinates from various Google Maps URL formats', () => {
    const url1 = 'https://www.google.com/maps/@20.005882,73.789764,17z';
    const coords1 = extractCoordinatesFromUrl(url1);
    expect(coords1).toEqual({ latitude: 20.005882, longitude: 73.789764 });

    const url2 = 'https://maps.google.com/?q=19.997500,73.789800';
    const coords2 = extractCoordinatesFromUrl(url2);
    expect(coords2).toEqual({ latitude: 19.9975, longitude: 73.7898 });

    const url3 = 'https://www.google.com/maps/place/Data/!3d20.012345!4d73.754321';
    const coords3 = extractCoordinatesFromUrl(url3);
    expect(coords3).toEqual({ latitude: 20.012345, longitude: 73.754321 });
  });

  it('should validate coordinate ranges strictly (-90 to 90, -180 to 180)', () => {
    expect(isValidCoordinate(20.005882, 73.789764)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(91, 73)).toBe(false);
    expect(isValidCoordinate(20, 181)).toBe(false);
    expect(isValidCoordinate(NaN, 73)).toBe(false);
  });
});
