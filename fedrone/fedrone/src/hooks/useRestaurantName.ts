import { useEffect, useMemo, useState } from 'react';
import { restaurantsApi } from '../api/restaurants';

/**
 * Hook lấy tên nhà hàng theo id (ưu tiên cache localStorage để hiển thị nhanh).
 */
export function useRestaurantName(restaurantId?: string | null) {
  const rid = useMemo(() => (restaurantId ?? undefined), [restaurantId]);
  const [name, setName] = useState<string | undefined>(() => {
    if (!rid) return undefined;
    try {
      return localStorage.getItem(`restaurantName:${rid}`) ?? undefined;
    } catch {
      return undefined;
    }
  });
  const [loading, setLoading] = useState<boolean>(!!rid && !name);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!rid) {
      setName(undefined);
      setLoading(false);
      setError(undefined);
      return;
    }
    // Nếu đã có cache name thì vẫn thử refresh nền (silent)
    (async () => {
      try {
        const r = await restaurantsApi.get(rid);
        if (cancelled) return;
        const n = r?.name || undefined;
        setName(n);
        setError(undefined);
        setLoading(false);
        try {
          if (n) localStorage.setItem(`restaurantName:${rid}`, n);
        } catch {}
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Không tải được tên nhà hàng');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rid]);

  return { name, loading, error };
}
