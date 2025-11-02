import { Router, Request, Response } from 'express';
import { cartService, CartItemInput } from '../services/cartService';
import { auth } from './middlewares';

export const router = Router();

// API Giỏ hàng (yêu cầu đăng nhập)
// - GET /: Lấy giỏ hàng hiện tại của người dùng (dựa trên token)
// - POST /: Ghi đè danh sách items trong giỏ hàng với mảng items client gửi lên
// Lưu ý: server tính toán giá dựa trên dữ liệu MenuItem hiện tại ở backend.

router.get('/', auth(), async (req: Request, res: Response) => {
  const user = (req as unknown as Request & { user: { id: string } }).user;
  const data = await cartService.get(user.id);
  res.json(data);
});

router.post('/', auth(), async (req: Request, res: Response) => {
  const user = (req as unknown as Request & { user: { id: string } }).user;
  const items = (req.body?.items as CartItemInput[]) || [];
  const data = await cartService.setItems(user.id, items);
  res.json(data);
});
