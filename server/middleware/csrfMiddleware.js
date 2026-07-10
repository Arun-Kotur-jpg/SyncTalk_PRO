import crypto from 'crypto';

// Generate a CSRF token and set it as a readable cookie + return in body
export const issueCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, {
    httpOnly: false, // Client JS needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/',
  });
  res.json({ csrfToken: token });
};

// Verify the X-CSRF-Token header matches the csrfToken cookie
export const verifyCsrf = (req, res, next) => {
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
};
