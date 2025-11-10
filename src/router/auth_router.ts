import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: username || null }] },
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username: username || null, email, password: hashedPassword },
    });

    return res.status(201).json({
      success: true,
      message: 'User registered',
      data: { userId: user.id },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to register user' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1h' });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { token },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to login' });
  }
});

router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
      select: { id: true, username: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch user' });
  }
});

export default router;
