import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1]; 
  if (!token) return res.status(401).json({ error: 'Access denied, no token provided' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    (req as any).user = verified; 
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};