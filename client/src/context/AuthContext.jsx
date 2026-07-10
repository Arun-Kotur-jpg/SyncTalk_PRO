import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { loginUser, registerUser, logoutUser, refreshToken, verifyEmail as verifyEmailApi } from '../api/auth';
import { getMe } from '../api/users';

export const AuthContext = createContext(null);

// In-memory access token — never persisted to storage
let _accessToken = null;

export const getAccessToken = () => _accessToken;
export const setAccessToken = (token) => { _accessToken = token; };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // On mount, attempt a silent refresh (cookie-based) to restore the session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await refreshToken();
        setAccessToken(data.accessToken);
        const meRes = await getMe();
        setUser(meRes.data);
      } catch {
        // No valid session — stay logged out
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { data } = await loginUser({ email, password });
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data;
    } catch (err) {
      let message = err.response?.data?.message || 'Login failed';
      if (err.response?.data?.errors?.length > 0) {
        message = err.response.data.errors[0].message;
      }
      const unverified = err.response?.data?.unverified;
      setError(message);
      throw { message, unverified, email };
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    setError(null);
    try {
      const { data } = await registerUser({ username, email, password });
      return data;
    } catch (err) {
      let message = err.response?.data?.message || 'Registration failed';
      if (err.response?.data?.errors?.length > 0) {
        message = err.response.data.errors[0].message;
      }
      setError(message);
      throw new Error(message);
    }
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    setError(null);
    try {
      const { data } = await verifyEmailApi({ email, otp });
      setAccessToken(data.accessToken);
      setUser(data.user);
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Verification failed';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Continue logout even if API call fails
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, verifyOtp, logout, updateUser, setError }}
    >
      {children}
    </AuthContext.Provider>
  );
};
