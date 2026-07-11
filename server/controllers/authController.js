import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Maximum number of concurrent sessions (refresh tokens) per user
const MAX_SESSIONS = 10;

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      if (user.isVerified) {
        const field = user.email === email ? 'Email' : 'Username';
        return res.status(409).json({ message: `${field} already in use` });
      } else {
        // Unverified user trying to register again - just update password and resend OTP
        user.password = password;
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000;
        await user.save();
        await sendVerificationEmail(user.email, otp);
        return res.status(201).json({ message: 'Registration successful. New OTP sent to email.', email: user.email });
      }
    }

    user = await User.create({ username, email, password });

    const otp = generateOTP();
    user.otp = otp; // In a real app, hash this OTP before saving
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendVerificationEmail(user.email, otp);

    res.status(201).json({ message: 'Registration successful. OTP sent to email.', email: user.email });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: `Server error during registration: ${error.message}` });
  }
};

// POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });
    
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens = [
      ...user.refreshTokens.slice(-MAX_SESSIONS + 1),
      { token: refreshToken, createdAt: new Date() },
    ];
    await user.save();

    res.json({ message: 'Email verified successfully', user, accessToken, refreshToken });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(user.email, otp);
    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first', email: user.email, unverified: true });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens = [
      ...user.refreshTokens.slice(-MAX_SESSIONS + 1),
      { token: refreshToken, createdAt: new Date() },
    ];
    user.lastSeen = new Date();
    await user.save();

    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: `Server error during login: ${error.message}` });
  }
};

// POST /api/auth/refresh
export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Find the matching session entry in the array
    const sessionIndex = user.refreshTokens.findIndex((s) => s.token === token);
    if (sessionIndex === -1) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // Rotate refresh token
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate: replace only the matched session entry
    user.refreshTokens[sessionIndex] = { token: newRefreshToken, createdAt: new Date() };
    await user.save();

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      // Remove only the current session's token, leave other sessions intact
      const token = req.body?.refreshToken;
      if (token) {
        user.refreshTokens = user.refreshTokens.filter((s) => s.token !== token);
      }
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'If an account with this email exists, an OTP has been sent.' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendPasswordResetEmail(user.email, otp);
    res.json({ message: 'If an account with this email exists, an OTP has been sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process forgot password request' });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid request' });

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};
