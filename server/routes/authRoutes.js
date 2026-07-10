import { Router } from 'express';
import { register, login, refreshAccessToken, logout, verifyEmail, resendOtp, forgotPassword, resetPassword } from '../controllers/authController.js';
import { registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/authValidator.js';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { issueCsrfToken, verifyCsrf } from '../middleware/csrfMiddleware.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), resendOtp);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/csrf', issueCsrfToken);
router.post('/refresh', verifyCsrf, refreshAccessToken);
router.post('/logout', auth, verifyCsrf, logout);

export default router;
