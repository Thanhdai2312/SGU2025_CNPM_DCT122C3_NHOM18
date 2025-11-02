import { Router, Request, Response } from 'express';

export const router = Router();

// Endpoint kiểm tra sống/chết của server
router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
