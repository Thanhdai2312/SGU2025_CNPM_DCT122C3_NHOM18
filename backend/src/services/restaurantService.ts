import { restaurantRepository } from '../repositories/restaurantRepository';

// Dịch vụ Nhà hàng: lớp mỏng bọc repository để có thể bổ sung nghiệp vụ sau này
export const restaurantService = {
  // Liệt kê chi nhánh (id, name, address, lat/lng)
  list: async () => {
    return restaurantRepository.list();
  },
  // Lấy menu khả dụng của chi nhánh
  getMenu: async (restaurantId: string) => {
    const items = await restaurantRepository.findMenu(restaurantId);
    if (items.length > 0) return items;
    // Nếu chưa có menu, clone từ template (đảm bảo trải nghiệm tạm thời giống seed)
    const templateId = await restaurantRepository.findTemplateRestaurantId();
    if (templateId) {
      await restaurantRepository.cloneMenuFrom(templateId, restaurantId);
      return restaurantRepository.findMenu(restaurantId);
    }
    return [];
  },
  // Tạo mới nhà hàng
  create: async (input: { name: string; address: string; lat: number; lng: number }) => {
    const created = await restaurantRepository.create(input);
    // Sau khi tạo, clone menu từ template nếu có
    const templateId = await restaurantRepository.findTemplateRestaurantId();
    if (templateId) {
      await restaurantRepository.cloneMenuFrom(templateId, created.id);
    }
    return created;
  },
  // Cập nhật nhà hàng
  update: async (id: string, input: Partial<{ name: string; address: string; lat: number; lng: number }>) => {
    return restaurantRepository.update(id, input);
  },
  // Xoá nhà hàng
  remove: async (id: string) => {
    return restaurantRepository.delete(id);
  },
};
