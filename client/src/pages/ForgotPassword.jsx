import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Key, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { forgotPassword, resetPassword } from '../api/auth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP & New Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await forgotPassword({ email });
      setStep(2);
      setSuccessMsg("If an account with this email exists, an OTP has been sent.");
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword({ email, otp, newPassword });
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-dark-950">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-dark-50 mb-2">Reset Password</h1>
          <p className="text-dark-400">Enter your email to receive an OTP.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="card space-y-5 relative overflow-hidden">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Input
              icon={Mail}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" className="w-full mt-2" loading={loading}>
              Send OTP
              {!loading && <ArrowRight size={18} className="ml-1" />}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="card space-y-5 relative overflow-hidden">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}
            
            {successMsg && !error && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <CheckCircle size={18} className="flex-shrink-0" />
                {successMsg}
              </div>
            )}

            <Input
              icon={Key}
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              minLength={6}
              maxLength={6}
              className="text-center tracking-widest font-mono text-lg"
            />

            <Input
              icon={Lock}
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />

            <Button type="submit" className="w-full mt-2" loading={loading}>
              Reset Password
              {!loading && <CheckCircle size={18} className="ml-1" />}
            </Button>
            
            <button
              type="button"
              onClick={() => { setStep(1); setError(null); setSuccessMsg(null); }}
              className="w-full text-sm text-dark-400 hover:text-dark-200 mt-2"
            >
              Change Email
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-dark-400">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
