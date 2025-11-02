import { useEffect, useMemo, useState } from 'react';
import { usersAdminApi, type AdminUser } from '../../api/usersAdmin';
import { Trash2, UserCog, Search, ShieldCheck, Phone, Calendar } from 'lucide-react';

// Trang Người dùng (Admin)
// - Tìm kiếm, lọc theo vai trò, xoá người dùng
export default function AdminUsers() {
  const [stats, setStats] = useState<{ admins: number; customers: number } | null>(null);
  const [list, setList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'ALL' | 'ADMIN' | 'CUSTOMER'>('ALL');

  const adminId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('adminUser') || '{}')?.id as string | undefined; } catch { return undefined; }
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, u] = await Promise.all([
        usersAdminApi.stats(),
        usersAdminApi.list({ search: search || undefined, role: role === 'ALL' ? undefined : role })
      ]);
      setStats(s);
      setList(u);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { const t = setTimeout(() => void load(), 300); return () => clearTimeout(t); }, [search, role]);

  const onDelete = async (id: string) => {
    if (!confirm('Xoá tài khoản này? Hành động không thể hoàn tác.')) return;
    try {
      await usersAdminApi.remove(id);
      await load();
      // Nếu tự xoá chính mình thì đăng xuất khu vực quản trị
      if (adminId && id === adminId) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
      }
    } catch (e: any) {
      alert(e?.message || 'Xoá thất bại');
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Quản lý người dùng</h2>
        <p className="text-gray-500 text-sm">Xem số lượng, tìm kiếm và xoá tài khoản (kể cả tài khoản của chính bạn).</p>
      </div>

  {/* Thẻ thống kê lớn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Quản trị viên"
          value={stats ? stats.admins : '—'}
          tone="rose"
          icon={<ShieldCheck className="w-6 h-6 text-rose-700" />}
          desc="Số lượng tài khoản ADMIN"
        />
        <StatCard
          title="Người dùng"
          value={stats ? stats.customers : '—'}
          tone="sky"
          icon={<UserCog className="w-6 h-6 text-sky-700" />}
          desc="Số lượng tài khoản CUSTOMER"
        />
      </div>

  {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT"
            className="pl-9 pr-3 py-2 border rounded-lg w-72"
          />
        </div>
        <select value={role} onChange={e => setRole(e.target.value as any)} className="border rounded-lg px-3 py-2">
          <option value="ALL">Tất cả vai trò</option>
          <option value="ADMIN">Chỉ ADMIN</option>
          <option value="CUSTOMER">Chỉ CUSTOMER</option>
        </select>
      </div>

  {/* Danh sách */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Người dùng</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">SĐT</th>
              <th className="text-left px-4 py-2">Vai trò</th>
              <th className="text-left px-4 py-2">Tạo lúc</th>
              <th className="px-4 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Đang tải…</td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-rose-600">{error}</td></tr>
            )}
            {!loading && !error && list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Không có người dùng</td></tr>
            )}
            {list.map(u => (
              <tr key={u.id} className="border-t odd:bg-gray-50/70">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} role={u.role} />
                    <div>
                      <div className="font-medium text-gray-800">{u.name}</div>
                      <div className="text-xs text-gray-500">#{u.id.slice(0,6)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-700">{u.email}</td>
                <td className="px-4 py-2 text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{u.phone || '—'}</td>
                <td className="px-4 py-2"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-2 text-gray-600 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />{new Date(u.createdAt).toLocaleString('vi-VN')}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => onDelete(u.id)} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-sm hover:shadow ${adminId===u.id? 'border-rose-300 text-rose-700 hover:bg-rose-50':'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                    <Trash2 className="w-4 h-4" /> Xoá
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, desc, icon, tone }: { title: string; value: number | string; desc?: string; icon?: React.ReactNode; tone: 'rose' | 'sky' }) {
  const styles = tone === 'rose'
    ? { ring: 'ring-rose-100', header: 'from-rose-50 to-white text-rose-800', accent: 'text-rose-700' }
    : { ring: 'ring-sky-100', header: 'from-sky-50 to-white text-sky-800', accent: 'text-sky-700' };
  return (
    <div className={`bg-white rounded-xl shadow ring-1 ${styles.ring} overflow-hidden`}>
      <div className={`px-4 py-3 font-semibold border-b bg-gradient-to-r ${styles.header}`}>{title}</div>
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className={`text-3xl font-bold ${styles.accent}`}>{value}</div>
          {desc && <div className="text-sm text-gray-500 mt-1">{desc}</div>}
        </div>
        {icon}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: 'ADMIN' | 'CUSTOMER' }) {
  const isAdmin = role === 'ADMIN';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${isAdmin? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
      {isAdmin ? 'ADMIN' : 'CUSTOMER'}
    </span>
  );
}

function Avatar({ name, role }: { name: string; role: 'ADMIN' | 'CUSTOMER' }) {
  const initials = (name || '?').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase();
  const isAdmin = role === 'ADMIN';
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold ${isAdmin? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
      {initials}
    </div>
  );
}
