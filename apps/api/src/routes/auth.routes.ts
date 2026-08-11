import { Router, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/security.middleware.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  adminCreateUserSchema,
  updateUserRoleSchema,
} from '@rag/shared';

const router: Router = Router();

// POST /api/auth/register (Public - strictly creates 'user' role)
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input.name, input.email, input.password, req.ip);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login (Rate limited, brute force protected)
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input.email, input.password, req.ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const input = refreshTokenSchema.parse(req.body);
    const result = await authService.refresh(input.refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me (Authenticated)
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await userRepository.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ================= ADMIN USER MANAGEMENT (Role-Gated) =================

// GET /api/auth/admin/users (Admin only: List all users)
router.get('/admin/users', authMiddleware, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response, next) => {
  try {
    const usersList = await authService.listAllUsers();
    res.json({ success: true, data: usersList });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin/create-user (Admin only: Create user or admin account)
router.post('/admin/create-user', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const input = adminCreateUserSchema.parse(req.body);
    const newUser = await authService.adminCreateUser(
      req.user!.userId,
      input.name,
      input.email,
      input.password,
      input.role,
      req.ip
    );
    res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/admin/users/:id/role (Admin only: Change role)
router.patch('/admin/users/:id/role', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const input = updateUserRoleSchema.parse(req.body);
    const updatedUser = await authService.updateUserRole(
      req.user!.userId,
      req.params.id,
      input.role,
      req.ip
    );
    res.json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/admin/users/:id (Admin only: Delete user)
router.delete('/admin/users/:id', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await authService.deleteUser(req.user!.userId, req.params.id, req.ip);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
