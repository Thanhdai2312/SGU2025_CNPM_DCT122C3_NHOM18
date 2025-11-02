import { restaurantRepository } from '../repositories/restaurantRepository';

// Dịch vụ Nhà hàng: lớp mỏng bọc repository để có thể bổ sung nghiệp vụ sau này
export const restaurantService = {
  // Liệt kê chi nhánh (id, name, address, lat/lng)
  list: async () => {
    return restaurantRepository.list();
  },
  // Lấy menu khả dụng của chi nhánh
  getMenu: async (restaurantId: string) => {
    return restaurantRepository.findMenu(restaurantId);
  },
};
