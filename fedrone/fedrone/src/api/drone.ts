// API client Drone cho Admin/Operator
// - list(): danh sách drone với thông tin trạm
// - availability(): thống kê nhanh số drone AVAILABLE và tải trọng tối đa
// - create()/update(): quản lý drone; hỗ trợ homeStationId/currentStationId (chọn từ combobox)
// - returnHome(): yêu cầu worker đưa drone về trạm sở hữu
import { API_BASE } from './client';

export type Drone = {
  id: string;
  code: string;
  capacityKg: number;
  maxRangeKm: number;
  batteryPercent: number;
  status: 'AVAILABLE' | 'BUSY' | 'CHARGING' | 'MAINTENANCE' | 'OFFLINE';
  createdAt?: string;
  updatedAt?: string;
  homeStation?: { id: string; name: string } | null;
  currentStation?: { id: string; name: string } | null;
};

export type Availability = { availableCount: number; maxCapacityKg: number };

type CreateDroneInput = {
  code: string;
  capacityKg: number;
  maxRangeKm: number;
  batteryPercent: number;
  homeStationId?: string;
  currentStationId?: string;
};

type UpdateDroneInput = Partial<{
  capacityKg: number;
  maxRangeKm: number;
  batteryPercent: number;
  status: Drone['status'];
  homeStationId: string | null;
  currentStationId: string | null;
}>;

function adminAuthHeaders(tokenOverride?: string): HeadersInit {
  const token = tokenOverride || localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const droneApi = {
  async list(tokenOverride?: string): Promise<Drone[]> {
    const res = await fetch(`${API_BASE}/api/drone`, { headers: { ...(adminAuthHeaders(tokenOverride) as any) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async availability(): Promise<Availability> {
    const res = await fetch(`${API_BASE}/api/drone/availability`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async create(input: CreateDroneInput, tokenOverride?: string): Promise<Drone> {
    const res = await fetch(`${API_BASE}/api/drone`, {
      method: 'POST',
      headers: adminAuthHeaders(tokenOverride),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async update(id: string, data: UpdateDroneInput, tokenOverride?: string): Promise<Drone> {
    const res = await fetch(`${API_BASE}/api/drone/${id}`, {
      method: 'PATCH',
      headers: adminAuthHeaders(tokenOverride),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async returnHome(id: string, tokenOverride?: string): Promise<Drone> {
    const res = await fetch(`${API_BASE}/api/drone/${id}/return-home`, {
      method: 'POST',
      headers: adminAuthHeaders(tokenOverride),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async recallToMe(id: string, tokenOverride?: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/drone/${id}/recall-to-me`, {
      method: 'POST',
      headers: adminAuthHeaders(tokenOverride),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
