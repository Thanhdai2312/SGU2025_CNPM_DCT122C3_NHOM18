// Toast đơn giản hiển thị thông báo (lỗi/thành công/thông tin)
export default function Toast({ message, onClose, tone = 'error', variant = 'toast' }: { message: string; onClose?: () => void; tone?: 'error' | 'info' | 'success'; variant?: 'toast' | 'panel' }) {
  if (variant === 'panel') {
  // Biến thể panel ở giữa màn hình cho thông báo nổi bật
    const panelColors = tone === 'error'
      ? 'bg-red-600 border-red-700 text-white'
      : tone === 'success'
      ? 'bg-emerald-600 border-emerald-700 text-white'
      : 'bg-blue-600 border-blue-700 text-white';
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none">
        <div className={`pointer-events-auto max-w-md w-[92%] sm:w-auto px-5 py-4 rounded-2xl border shadow-2xl ${panelColors}`}>
          <div className="flex items-start gap-3">
            <div className="text-xl leading-none">❗</div>
            <div className="flex-1 text-base font-medium">{message}</div>
            {onClose && (
              <button onClick={onClose} className="ml-2 text-white/90 hover:text-white">✕</button>
            )}
          </div>
        </div>
      </div>
    );
  }
  // Mặc định: toast nhỏ ở góc trên bên phải
  const colors = tone === 'error'
    ? 'bg-red-50 border-red-200 text-red-700'
    : tone === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : 'bg-blue-50 border-blue-200 text-blue-700';
  return (
    <div className={`fixed top-4 right-4 z-[1000] px-4 py-3 rounded-xl border shadow ${colors}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{message}</span>
        {onClose && (
          <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">✕</button>
        )}
      </div>
    </div>
  );
}
