// API client Payment (mock)
// - mockCharge(): tạo chữ ký để thử webhook thủ công
// - webhook(): gửi webhook thanh toán (PAID/FAILED) tới backend
import { API_BASE } from './client';

export const paymentApi = {
  async mockCharge(orderId: string, outcome: 'PAID' | 'FAILED' = 'PAID') {
    const res = await fetch(`${API_BASE}/api/payment/mock/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, outcome }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ body: { orderId: string; status: 'PAID' | 'FAILED' }, signature: string }>;
  },
  async sendWebhook(body: { orderId: string; status: 'PAID' | 'FAILED' }, signature: string) {
    const idempotencyKey = cryptoRandomId();
    const res = await fetch(`${API_BASE}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-signature': signature, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

function cryptoRandomId() {
  // ID ngẫu nhiên đơn giản theo kiểu RFC4122
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && (crypto as any).getRandomValues) {
    (crypto as any).getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
}
