import { Router } from 'express';
import { register, login, refreshAccessToken, logout } from '../controllers/authController.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { issueCsrfToken, verifyCsrf } from '../middleware/csrfMiddleware.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/csrf', issueCsrfToken);
router.post('/refresh', verifyCsrf, refreshAccessToken);
router.post('/logout', auth, verifyCsrf, logout);

export default router;
