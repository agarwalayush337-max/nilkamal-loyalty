import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail, ShieldAlert, Phone, User, Camera, ArrowLeft, Send, CheckCircle } from 'lucide-react';

export default function Login() {
  const [loginMode, setLoginMode] = useState('otp'); // 'otp' or 'password'
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [notification, setNotification] = useState('');

  // Email login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP login states
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentOtpCode, setSentOtpCode] = useState('');

  // Contractor registration states
  const [registerName, setRegisterName] = useState('');
  const [registerMobile, setRegisterMobile] = useState('');
  const [registerPhoto, setRegisterPhoto] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  const { login, loginWithOtp, registerContractor, error: authError } = useAuth();
  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegisterPhoto(reader.result);
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }
    setLocalError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.role === 'admin') {
          navigate('/master-dashboard');
        } else {
          navigate('/contractor-dashboard');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!mobileNumber) {
      setLocalError('Please enter your mobile number.');
      return;
    }
    if (mobileNumber.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLocalError('');
    setLoading(true);

    const normalizedMobile = mobileNumber.trim();

    try {
      // Determine if we're in mock mode
      const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY.includes('PLACEHOLDER');
      
      let exists = false;
      if (isMockMode) {
        const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
        const list = savedContractors ? JSON.parse(savedContractors) : [];
        exists = list.some(c => c.mobileNumber === normalizedMobile) || normalizedMobile === '9876543210';
      } else {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const q = query(collection(db, 'users'), where('mobileNumber', '==', normalizedMobile), where('role', '==', 'contractor'));
        const querySnapshot = await getDocs(q);
        exists = !querySnapshot.empty;
      }

      if (!exists) {
        setLocalError('Mobile number is not registered. Please register as a new contractor first.');
        setLoading(false);
        return;
      }

      // Generate verification code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setSentOtpCode(generatedCode);
      setOtpSent(true);
      setNotification(`Verification Code sent to ${mobileNumber}: ${generatedCode}`);
      
      // Auto clear notification after 15s
      setTimeout(() => setNotification(''), 15000);
    } catch (err) {
      console.error("OTP send error:", err);
      setLocalError('Failed to verify mobile number. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setLocalError('Please enter the OTP verification code.');
      return;
    }
    if (otp !== sentOtpCode) {
      setLocalError('Incorrect verification code. Please check the code and try again.');
      return;
    }
    
    setLocalError('');
    setLoading(true);

    try {
      const res = await loginWithOtp(mobileNumber);
      if (res.success) {
        setNotification('');
        navigate('/contractor-dashboard');
      }
    } catch (err) {
      setLocalError(err.message || 'OTP login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerName || !registerMobile || !registerPhoto) {
      setLocalError('Please fill in all fields and upload a profile photo.');
      return;
    }
    if (registerMobile.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLocalError('');
    setLoading(true);

    try {
      const res = await registerContractor(registerName, registerMobile, registerPhoto);
      if (res.success) {
        setNotification('');
        navigate('/contractor-dashboard');
      }
    } catch (err) {
      setLocalError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const setTestCredentials = (role) => {
    setLocalError('');
    setNotification('');
    setIsRegistering(false);
    
    if (role === 'contractor') {
      setLoginMode('otp');
      setMobileNumber('9876543210');
      setOtpSent(false);
    } else {
      setLoginMode('password');
      setEmail('admin@test.com');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative">
      {/* simulated SMS OTP gateway popup */}
      {notification && (
        <div className="fixed top-4 max-w-md w-full mx-auto px-4 z-50 animate-bounce">
          <div className="bg-brand-dark text-white p-4 rounded-2xl shadow-2xl border-2 border-brand-blue flex gap-3 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
            <div className="flex-1">
              <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest block">Simulated SMS Gateway</span>
              <p className="text-xs font-bold text-slate-200 mt-0.5 leading-snug">{notification}</p>
            </div>
          </div>
        </div>
      )}

      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-2xl">
        
        {/* Header Block */}
        <div className="bg-brand-dark p-8 text-center text-white relative">
          <div className="absolute top-4 left-4 bg-brand-blue/20 text-brand-blue text-[10px] font-bold px-2.5 py-0.5 rounded tracking-wider uppercase">
            Loyalty Program
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 flex items-center justify-center gap-1">
            <span className="text-brand-blue">Nilkamal</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-bold">
            {isRegistering ? 'Contractor Registration' : 'Contractor Portal'}
          </p>
        </div>

        {/* Tab Headers (Only when not registering) */}
        {!isRegistering && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 m-4 rounded-2xl">
            <button
              onClick={() => { setLoginMode('otp'); setLocalError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                loginMode === 'otp' ? 'bg-brand-blue text-white shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mobile OTP
            </button>
            <button
              onClick={() => { setLoginMode('password'); setLocalError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                loginMode === 'password' ? 'bg-brand-blue text-white shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Email Login
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="px-8 pb-8 pt-4">
          {(localError || authError) && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {isRegistering ? (
            /* Registration Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setLocalError(''); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-slate-800">Register as Contractor</h2>
              </div>

              {/* Photo Upload Picker */}
              <div className="flex flex-col items-center gap-2.5 pb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider w-full">
                  Profile Photo *
                </label>
                <div className="relative">
                  {photoPreview ? (
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand-blue bg-slate-100 flex items-center justify-center">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-8 h-8 stroke-[1.5]" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-brand-blue hover:bg-brand-blue/95 text-white p-2 rounded-full cursor-pointer shadow-md transition-all active:scale-90">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      required
                    />
                  </label>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Upload JPEG/PNG Photo</span>
              </div>

              {/* Contractor Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    placeholder="e.g. Mukesh Sharma"
                    required
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Phone className="w-5 h-5" />
                  </span>
                  <input
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength="10"
                    value={registerMobile}
                    onChange={(e) => setRegisterMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    placeholder="10-digit number"
                    required
                  />
                </div>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-green-600/10 hover:shadow-green-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-75"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Register & Login</span>
                  </>
                )}
              </button>
            </form>
          ) : loginMode === 'otp' ? (
            /* OTP Login Form */
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Login with Mobile</h2>
              <p className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider -mt-3">
                Contractors OTP Verification
              </p>

              {!otpSent ? (
                /* Step 1: Send OTP */
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Phone className="w-5 h-5" />
                      </span>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength="10"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                        placeholder="Enter registered mobile number"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-blue hover:bg-brand-blue/95 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-blue/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-75"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send OTP Verification Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Verify OTP */
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase">MOBILE NUMBER</span>
                      <span className="text-slate-800 font-extrabold">{mobileNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(''); setLocalError(''); }}
                      className="text-brand-blue font-extrabold hover:underline uppercase tracking-wider text-[10px]"
                    >
                      Change Number
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Enter 6-Digit OTP Code
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Key className="w-5 h-5" />
                      </span>
                      <input
                        type="text"
                        maxLength="6"
                        pattern="[0-9]{6}"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 tracking-[0.2em] text-center font-extrabold focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                        placeholder="••••••"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-green-600/10 hover:shadow-green-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-75"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>Verify & Login</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Toggle to Registration */}
              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500 font-semibold">New contractor? </span>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setLocalError(''); }}
                  className="text-xs text-brand-blue font-black uppercase tracking-wider hover:underline"
                >
                  Register Account Here
                </button>
              </div>
            </div>
          ) : (
            /* Email Login Form */
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Admin / Dev Login</h2>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    placeholder="name@email.com"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Key className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue hover:bg-brand-blue/95 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-75"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Sandbox Login Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Developer Quick Login
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTestCredentials('contractor')}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                📝 Mock Contractor
              </button>
              <button
                type="button"
                onClick={() => setTestCredentials('admin')}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                👑 Master Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
