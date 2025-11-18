import { Plane, MapPin, Clock } from 'lucide-react';
// Trang chủ (landing) thân thiện tiếng Việt
// - Giới thiệu dịch vụ drone giao đồ ăn
// - Điều hướng nhanh tới menu/đặt hàng
import { Link } from 'react-router-dom';

const branches = [
  {
    id: 1,
    name: 'P&Đ CN1',
    location: '213A Nguyễn Văn Cừ, Phường 03, Quận 5, Thành phố Hồ Chí Minh 72700, Vietnam',
    deliveryTime: '15-25 min',
    image: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 2,
    name: 'P&Đ CN2',
    location: '230 Âu Dương Lân, Phường Rạch Ông, Quận 8, Thành phố Hồ Chí Minh, Vietnam',
    deliveryTime: '20-30 min',
    image: 'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 3,
    name: 'P&Đ CN3',
    location: '254/21 Bến Vân Đồn, Phường 2, Quận 4, Thành phố Hồ Chí Minh, Vietnam',
    deliveryTime: '18-28 min',
    image: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=800'
  }
];

export default function Home() {
  return (
    <>
  {/* Khu vực Hero (giới thiệu) */}
      <section className="container mx-auto px-6 pt-16 pb-12">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-6">
            <Plane className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Giao hàng bằng drone trong vài phút</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Món ngon giao tận nơi
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
              Bằng đường bay
            </span>
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Trải nghiệm tương lai của giao đồ ăn với dịch vụ drone tự động của chúng tôi.
            <br />
            Chọn chi nhánh gần bạn nhất và nhận món ăn trong thời gian kỷ lục.
          </p>
        </div>

  {/* Danh sách chi nhánh */}
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Chọn chi nhánh
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={branch.image}
                    alt={branch.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center space-x-1.5 shadow-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">{branch.deliveryTime}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {branch.name}
                  </h4>
                  <div className="flex items-start space-x-2 text-gray-600 mb-6">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-400" />
                    <span className="text-sm leading-relaxed">{branch.location}</span>
                  </div>
                  <Link to={`/restaurants/seed-restaurant-${branch.id}`} className="block w-full text-center py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-semibold rounded-xl shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200">
                    Đặt món ngay
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

  {/* Khu vực tính năng nổi bật */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Plane className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Giao nhanh</h4>
            <p className="text-gray-600">Nhận món ăn bằng drone trong vòng dưới 30 phút</p>
          </div>
          <div className="text-center p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Theo dõi thời gian thực</h4>
            <p className="text-gray-600">Xem drone giao hàng trực tiếp trên bản đồ</p>
          </div>
          <div className="text-center p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
            <div className="bg-gradient-to-br from-blue-500 to-sky-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Luôn tươi ngon</h4>
            <p className="text-gray-600">Thời gian giao ngắn hơn đồng nghĩa món ăn tươi hơn</p>
          </div>
        </div>
      </section>
    </>
  );
}
