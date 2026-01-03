import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/schema';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const authRouter = Router();

// Register new user
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role, organizationId } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Missing required fields', 400);
    }

    // Check if user exists
    const existingUser = await db.selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();

    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    // Hash password
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(password, rounds);

    // Create user
    const userId = uuidv4();
    await db.insertInto('users')
      .values({
        id: userId,
        email,
        password_hash: passwordHash,
        name,
        role: role || 'admin',
        organization_id: organizationId || uuidv4(),
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    logger.info('User registered', { userId, email });

    res.status(201).json({
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    next(error);
  }
});

// Login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    // Find user
    const user = await db.selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT secret not configured', 500);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('User logged in', { userId: user.id, email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organization_id
      }
    });
  } catch (error) {
    next(error);
  }
});
