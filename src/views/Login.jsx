import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, ShieldAlert, Phone, User, Camera, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [notification, setNotification] = useState('');

  // OTP login states
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentOtpCode, setSentOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  // Contractor registration states
  const [registerName, setRegisterName] = useState('');
  const [registerMobile, setRegisterMobile] = useState('');
  const [registerPhoto, setRegisterPhoto] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  const { loginWithOtp, registerContractor, error: authError } = useAuth();
  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize to max 400px width/height while maintaining ratio
          const maxDim = 400;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed jpeg base64 (quality 0.7)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setRegisterPhoto(compressedBase64);
          setPhotoPreview(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };


  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\s+/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    return cleaned;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const phoneToVerify = isRegistering ? registerMobile : mobileNumber;
    if (!phoneToVerify) {
      setLocalError('Please enter your mobile number.');
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneToVerify);
    const normalizedMobile = formattedPhone.replace(/\D/g, '').slice(-10);

    if (normalizedMobile.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLocalError('');
    setLoading(true);

    try {
      const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY.includes('PLACEHOLDER');
      
      let exists = false;
      if (isMockMode) {
        const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
        const list = savedContractors ? JSON.parse(savedContractors) : [];
        exists = list.some(c => c.mobileNumber === normalizedMobile) || normalizedMobile === '9876543210' || normalizedMobile === '9876543211';
      } else {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const q = query(collection(db, 'users'), where('mobileNumber', '==', normalizedMobile));
        const querySnapshot = await getDocs(q);
        exists = !querySnapshot.empty;
      }

      if (!isRegistering && !exists) {
        setLocalError('Mobile number is not registered. Please register first.');
        setLoading(false);
        return;
      }

      if (isRegistering && exists) {
        setLocalError('This mobile number is already registered. Please login.');
        setLoading(false);
        return;
      }

      if (isMockMode) {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSentOtpCode(generatedCode);
        setOtpSent(true);
        setNotification(`Verification Code sent to ${formattedPhone}: ${generatedCode}`);
        setTimeout(() => setNotification(''), 15000);
      } else {
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
          });
        }
        const appVerifier = window.recaptchaVerifier;
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation);
        setOtpSent(true);
        setNotification(`OTP verification code sent to ${formattedPhone}.`);
        setTimeout(() => setNotification(''), 15000);
      }
    } catch (err) {
      console.error("OTP send error:", err);
      setLocalError(err.message || 'Failed to send verification code. Check connection.');
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (e) {
          console.error("Error clearing recaptcha:", e);
        }
      }
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
    
    setLocalError('');
    setLoading(true);

    const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY.includes('PLACEHOLDER');

    try {
      const phoneToVerify = isRegistering ? registerMobile : mobileNumber;
      const formattedPhone = formatPhoneNumber(phoneToVerify);
      const normalizedMobile = formattedPhone.replace(/\D/g, '').slice(-10);

      if (isMockMode) {
        if (otp !== sentOtpCode) {
          setLocalError('Incorrect verification code. Please check the code and try again.');
          setLoading(false);
          return;
        }

        if (isRegistering) {
          const res = await registerContractor(registerName, normalizedMobile, registerPhoto);
          if (res.success) {
            setNotification('');
            navigate('/contractor-dashboard');
          }
        } else {
          const res = await loginWithOtp(normalizedMobile);
          if (res.success) {
            setNotification('');
            if (res.role === 'admin') {
              navigate('/master-dashboard');
            } else {
              navigate('/contractor-dashboard');
            }
          }
        }
      } else {
        if (!confirmationResult) {
          setLocalError('No active verification session. Please resend the code.');
          setLoading(false);
          return;
        }

        const userCredential = await confirmationResult.confirm(otp);
        const firebaseUser = userCredential.user;

        const { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase');

        let finalRole = 'contractor';
        let foundData = null;

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          foundData = userDocSnap.data();
          finalRole = foundData.role || 'contractor';
        } else {
          const q = query(collection(db, 'users'), where('mobileNumber', '==', normalizedMobile));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const matchedDoc = querySnapshot.docs[0];
            const matchedData = matchedDoc.data();
            finalRole = matchedData.role || 'contractor';

            await setDoc(userDocRef, { ...matchedData, uid: firebaseUser.uid });

            if (matchedDoc.id !== firebaseUser.uid) {
              const { deleteDoc } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'users', matchedDoc.id));

              const claimsRef = collection(db, 'claims');
              const claimsQ = query(claimsRef, where('contractorId', '==', matchedDoc.id));
              const claimsSnap = await getDocs(claimsQ);
              for (const claimD of claimsSnap.docs) {
                await updateDoc(doc(db, 'claims', claimD.id), { contractorId: firebaseUser.uid });
              }

              const redemptionsRef = collection(db, 'redemptions');
              const redemptionsQ = query(redemptionsRef, where('contractorId', '==', matchedDoc.id));
              const redemptionsSnap = await getDocs(redemptionsQ);
              for (const redD of redemptionsSnap.docs) {
                await updateDoc(doc(db, 'redemptions', redD.id), { contractorId: firebaseUser.uid });
              }
              console.log(`Successfully migrated user ${matchedDoc.id} data to Firebase UID ${firebaseUser.uid}`);
            }
            foundData = { ...matchedData, uid: firebaseUser.uid };
          } else {
            if (isRegistering) {
              const newContractor = {
                uid: firebaseUser.uid,
                name: registerName,
                mobileNumber: normalizedMobile,
                photo: registerPhoto,
                role: 'contractor',
                totalPoints: 0,
                activeGoal: null,
                lastLoginTime: Date.now(),
                lastTransaction: { description: 'Registered account', timestamp: Date.now() }
              };
              await setDoc(userDocRef, newContractor);
              foundData = newContractor;
              finalRole = 'contractor';
            } else {
              const defaultData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Contractor',
                mobileNumber: normalizedMobile,
                role: 'contractor',
                totalPoints: 0,
                activeGoal: null,
                lastLoginTime: Date.now()
              };
              await setDoc(userDocRef, defaultData);
              foundData = defaultData;
              finalRole = 'contractor';
            }
          }
        }

        localStorage.setItem('nilkamal_logged_in_mobile_uid', firebaseUser.uid);
        localStorage.removeItem('nilkamal_mock_user');
        
        setNotification('');
        if (finalRole === 'admin') {
          navigate('/master-dashboard');
        } else {
          navigate('/contractor-dashboard');
        }
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      setLocalError(err.message || 'OTP verification failed.');
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
    await handleSendOtp(e);
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

        {/* Form Body */}
        <div className="px-8 pb-8 pt-4">
          {(localError || authError) && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {otpSent ? (
            /* Stage 2: Verify OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase tracking-wider">Mobile Number</span>
                  <span className="text-slate-800 font-extrabold text-sm">{isRegistering ? registerMobile : mobileNumber}</span>
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
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
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 tracking-[0.3em] text-center font-black text-2xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0093DD] hover:bg-[#007cbd] active:scale-[0.99] text-white font-black py-4.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-lg disabled:opacity-75 uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-6 h-6" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>
            </form>
          ) : isRegistering ? (
            /* Stage 1 (Registration): Form Inputs */
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
                  <label className="absolute bottom-0 right-0 bg-[#0093DD] hover:bg-[#007cbd] text-white p-2 rounded-full cursor-pointer shadow-md transition-all active:scale-90">
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
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-extrabold text-sm border-r border-slate-200 pr-3 h-full">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength="10"
                    value={registerMobile}
                    onChange={(e) => setRegisterMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              {/* Register & Send OTP Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0093DD] hover:bg-[#007cbd] active:scale-[0.99] text-white font-black py-4 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-75 uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Register & Send OTP</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Stage 1 (Login): Mobile Number Input */
            <form onSubmit={handleSendOtp} className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Login with Mobile</h2>
              <p className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider -mt-3">
                OTP Verification
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-extrabold text-base border-r border-slate-200 pr-3 h-full">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength="10"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-16 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all text-xl font-bold"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0093DD] hover:bg-[#007cbd] active:scale-[0.99] text-white font-black py-4.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-lg disabled:opacity-75 uppercase tracking-wider"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send OTP</span>
                  </>
                )}
              </button>

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
            </form>
          )}
        </div>
      </div>

      {/* recaptcha container for Firebase invisible recaptcha */}
      <div id="recaptcha-container" className="mt-4"></div>
    </div>
  );
}
