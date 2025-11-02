import { Router, Request, Response } from 'express';
import { restaurantService } from '../services/restaurantService';

export const router = Router();

// Danh sách nhà hàng (chi nhánh)
router.get('/', async (_req: Request, res: Response) => {
  const data = await restaurantService.list();
  res.json(data);
});

// Danh sách món của 1 nhà hàng
router.get('/:id/menu', async (req: Request, res: Response) => {
  const data = await restaurantService.getMenu(req.params.id);
  res.json(data);
});
