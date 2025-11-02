// Khoảng cách Haversine (km)
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// Bao bọc: ưu tiên OSRM nếu có cấu hình, nếu lỗi sẽ quay về Haversine
export async function calculateDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<{ distanceKm: number; durationMinutes: number }> {
  try {
    if (process.env.OSRM_BASE_URL) {
      const { osrmRouteDistance } = await import('./osrmService');
      const r = await osrmRouteDistance(originLat, originLng, destLat, destLng);
      return { distanceKm: r.distanceKm, durationMinutes: r.durationMinutes };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('OSRM lỗi, chuyển về Haversine:', (e as Error).message);
  }
  const distanceKm = haversineKm(originLat, originLng, destLat, destLng);
  // Giả định drone 40 km/h để ước lượng thời gian nếu chỉ có Haversine
  return { distanceKm, durationMinutes: Math.round((distanceKm / 40) * 60) };
}
