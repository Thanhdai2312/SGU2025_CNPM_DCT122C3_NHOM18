// Tích hợp OSRM (Open Source Routing Machine)
// Yêu cầu Node >= 18 để có sẵn global fetch

export type DistanceResult = {
  distanceKm: number;
  durationMinutes: number;
  distanceText?: string;
  durationText?: string;
};

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

/**
 * Gọi API OSRM để lấy quãng đường (mét) và thời gian (giây).
 * API: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false
 */
export async function osrmRouteDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<DistanceResult> {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is not available. Please use Node.js >= 18');
  }
  const url = `${OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`OSRM error: HTTP ${res.status}`);
  const data = (await res.json()) as any;
  if (!data.routes || !data.routes[0]) throw new Error('OSRM no route');

  const distanceMeters = data.routes[0].distance as number;
  const durationSeconds = data.routes[0].duration as number;

  return {
    distanceKm: distanceMeters / 1000,
    durationMinutes: Math.round(durationSeconds / 60),
    distanceText: `${(distanceMeters / 1000).toFixed(2)} km`,
    durationText: `${Math.round(durationSeconds / 60)} phút`,
  };
}

/**
 * Tuỳ chọn: lấy full geometry để vẽ bản đồ.
 * API: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
 */
export async function osrmDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch is not available. Please use Node.js >= 18');
  }
  const url = `${OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`OSRM error: HTTP ${res.status}`);
  const data = (await res.json()) as any;
  if (!data.routes || !data.routes[0]) throw new Error('OSRM no route');
  return data.routes[0];
}
