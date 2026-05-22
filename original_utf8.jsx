import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Image as ImageIcon, Camera, X, Award, FileText, CheckCircle2, AlertCircle, Clock, LayoutDashboard, Gift, History } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const translations = {
  en: {
    // Tabs
    tabDashboard: "Dashboard",
    tabRewards: "Rewards",
    tabHistory: "History",
    
    // Dashboard / Points
    totalPoints: "YOUR TOTAL POINTS",
    subPoints: "Nilkamal Contractor Reward Points",
    
    // Active Goal Progress
    activeGoalProgress: "🎯 Active Goal Progress",
    redemptionSuccess: "Redemption Success!",
    redemptionSuccessSub: "Your reward request is sent to the admin.",
    target: "Target",
    pts: "Pts",
    complete: "Complete",
    redeemPrizeNow: "Redeem Prize Now",
    goalFocus: "🎯 GOAL FOCUS",
    goalFocusText: "You only need {points} more points to get your prize!",
    uploadMoreBills: "Upload more bills to collect points",
    noActiveGoal: "No active goal selected.",
    noActiveGoalSub: "Select a reward from the catalog below to set a goal and track progress!",
    
    // Upload Button
    uploadNewBill: "Upload New Bill",
    tapToUpload: "Tap to open camera & upload",
    
    // Rewards Catalog
    rewardsCatalog: "Rewards Catalog",
    loadingCatalog: "Loading rewards catalog...",
    noRewardsYet: "No rewards added yet.",
    askAdminRewards: "Ask the administrator to create rewards!",
    currentGoal: "🎯 Current Goal",
    setAsGoal: "Set as Goal",
    
    // Submitted Bills
    yourSubmittedBills: "Your Submitted Bills",
    loadingBillHistory: "Loading bill history...",
    noBillsUploaded: "No bills uploaded yet.",
    submitFirstBill: "Submit your first bill above to earn points!",
    billNumber: "Bill Number",
    amt: "Amt",
    rft: "RFT",
    approved: "Approved",
    rejected: "Rejected",
    waiting: "Waiting",
    
    // Redemption History
    redemptionHistory: "Redemption History",
    loadingRedemptionHistory: "Loading redemption history...",
    noRedemptionsYet: "No redemptions requested yet.",
    completeGoalRedeem: "Complete a goal to redeem prizes!",
    spent: "Spent",
    date: "Date",
    delivered: "Delivered",
    requested: "Requested",
    handedOver: "Handed Over",
    viewDeliveryPhoto: "View Delivery Photo",
    proofOfDelivery: "Proof of Delivery",
    proofOfDeliverySub: "This item has been successfully delivered by the administrator.",
    
    // Upload Modal
    newBillUpload: "New Bill Upload",
    takePhoto: "1. Take Photo of Bill (Optional)",
    openCamera: "Open Camera / Upload",
    imageFormat: "JPEG or PNG image",
    enterRft: "2. Enter Running Feet (RFT) *",
    estPoints: "Estimated Points to Earn",
    noteRft: "Note: You earn exactly 1 Point for every 1 Running Foot (RFT).",
    enterAmt: "3. Enter Bill Amount (₹) *",
    billNumOpt: "4. Bill Number (Optional)",
    billDateLabel: "5. Bill Date *",
    sendBillNow: "Send Bill Now",
    submitted: "SUBMITTED!",
    waitApproval: "Wait for master approval to get points."
  },
  hi: {
    // Tabs
    tabDashboard: "डैशबोर्ड",
    tabRewards: "इनाम",
    tabHistory: "इतिहास",
    
    // Dashboard / Points
    totalPoints: "आपके कुल पॉइंट्स",
    subPoints: "नीलकमल ठेकेदार इनाम पॉइंट्स",
    
    // Active Goal Progress
    activeGoalProgress: "🎯 सक्रिय लक्ष्य प्रगति",
    redemptionSuccess: "सफल मोचन!",
    redemptionSuccessSub: "आपका इनाम अनुरोध व्यवस्थापक को भेज दिया गया है।",
    target: "लक्ष्य",
    pts: "पॉइंट्स",
    complete: "पूरा",
    redeemPrizeNow: "अभी इनाम रिडीम करें",
    goalFocus: "🎯 लक्ष्य पर ध्यान दें",
    goalFocusText: "आपको अपना इनाम पाने के लिए केवल {points} और पॉइंट्स की आवश्यकता है!",
    uploadMoreBills: "पॉइंट्स इकट्ठा करने के लिए और बिल अपलोड करें",
    noActiveGoal: "कोई सक्रिय लक्ष्य नहीं चुना गया।",
    noActiveGoalSub: "लक्ष्य निर्धारित करने और प्रगति को ट्रैक करने के लिए इनाम कैटलॉग से एक इनाम चुनें!",
    
    // Upload Button
    uploadNewBill: "नया बिल अपलोड करें",
    tapToUpload: "कैमरा खोलने और अपलोड करने के लिए टैप करें",
    
    // Rewards Catalog
    rewardsCatalog: "इनाम कैटलॉग",
    loadingCatalog: "इनाम कैटलॉग लोड हो रहा है...",
    noRewardsYet: "अभी तक कोई इनाम नहीं जोड़ा गया है।",
    askAdminRewards: "व्यवस्थापक से इनाम बनाने के लिए कहें!",
    currentGoal: "🎯 सक्रिय लक्ष्य",
    setAsGoal: "लक्ष्य के रूप में सेट करें",
    
    // Submitted Bills
    yourSubmittedBills: "आपके सबमिट किए गए बिल",
    loadingBillHistory: "बिल इतिहास लोड हो रहा है...",
    noBillsUploaded: "अभी तक कोई बिल अपलोड नहीं किया गया है।",
    submitFirstBill: "पॉइंट्स अर्जित करने के लिए ऊपर अपना पहला बिल सबमिट करें!",
    billNumber: "बिल संख्या",
    amt: "राशि",
    rft: "रनिंग फीट",
    approved: "स्वीकृत",
    rejected: "अस्वीकृत",
    waiting: "प्रतीक्षारत",
    
    // Redemption History
    redemptionHistory: "इनाम अनुरोध इतिहास",
    loadingRedemptionHistory: "अनुरोध इतिहास लोड हो रहा है...",
    noRedemptionsYet: "अभी तक कोई इनाम अनुरोध नहीं किया गया है।",
    completeGoalRedeem: "इनाम रिडीम करने के लिए एक लक्ष्य पूरा करें!",
    spent: "खर्च किए गए",
    date: "दिनांक",
    delivered: "वितरित",
    requested: "अनुरोधित",
    handedOver: "हैंडओवर किया गया",
    viewDeliveryPhoto: "डिलिवरी फोटो देखें",
    proofOfDelivery: "डिलिवरी का प्रमाण",
    proofOfDeliverySub: "यह आइटम व्यवस्थापक द्वारा सफलतापूर्वक वितरित कर दिया गया है।",
    
    // Upload Modal
    newBillUpload: "नया बिल अपलोड",
    takePhoto: "1. बिल का फोटो लें (वैकल्पिक)",
    openCamera: "कैमरा खोलें / अपलोड करें",
    imageFormat: "JPEG या PNG इमेज",
    enterRft: "2. रनिंग फीट (RFT) दर्ज करें *",
    estPoints: "अर्जित करने के लिए अनुमानित पॉइंट्स",
    noteRft: "नोट: आप प्रत्येक 1 रनिंग फुट (RFT) के लिए ठीक 1 पॉइंट अर्जित करते हैं।",
    enterAmt: "3. बिल राशि (₹) दर्ज करें *",
    billNumOpt: "4. बिल संख्या (वैकल्पिक)",
    billDateLabel: "5. बिल दिनांक *",
    sendBillNow: "अभी बिल भेजें",
    submitted: "सबमिट हो गया!",
    waitApproval: "पॉइंट्स प्राप्त करने के लिए मुख्य मंजूरी की प्रतीक्षा करें।"
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export default function ContractorDashboard() {
  const { user, userData, logout, isMock, setUserData, updateActiveGoal, updateContractorPoints, updateContractorTransaction } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Language & Tab States
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('nilkamal_contractor_lang') || 'en';
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    localStorage.setItem('nilkamal_contractor_lang', language);
  }, [language]);

  const t = translations[language];

  // Form states
  const [billNumber, setBillNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [runningFeet, setRunningFeet] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billImage, setBillImage] = useState(null);
  const [billImagePreview, setBillImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Claims history state
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);

  // Phase 3 States
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [redemptions, setRedemptions] = useState([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [selectedDeliveryProof, setSelectedDeliveryProof] = useState(null);

  // Load claims from Firestore or localStorage
  const loadClaims = async () => {
    setLoadingClaims(true);
    if (isMock) {
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const mockClaimsList = savedClaims ? JSON.parse(savedClaims) : [];
      // Filter claims for current user
      const filtered = mockClaimsList.filter(c => c.contractorId === user.uid);
      // Sort by timestamp desc
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      setClaims(filtered);
      setLoadingClaims(false);
      return;
    }

    try {
      const claimsRef = collection(db, 'claims');
      const q = query(
        claimsRef, 
        where('contractorId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const claimsList = [];
      querySnapshot.forEach((doc) => {
        claimsList.push({ id: doc.id, ...doc.data() });
      });
      // Sort by timestamp desc locally if orderBy requires indexes we haven't configured yet
      claimsList.sort((a, b) => {
        const t1 = a.timestamp?.seconds || a.timestamp || 0;
        const t2 = b.timestamp?.seconds || b.timestamp || 0;
        return t2 - t1;
      });
      setClaims(claimsList);
    } catch (err) {
      console.error("Error loading claims from Firestore:", err);
      // Fallback: load mock claims anyway to prevent crash
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const mockClaimsList = savedClaims ? JSON.parse(savedClaims) : [];
      setClaims(mockClaimsList.filter(c => c.contractorId === user.uid));
    } finally {
      setLoadingClaims(false);
    }
  };

  const loadGoals = async () => {
    setLoadingGoals(true);
    if (isMock) {
      const saved = localStorage.getItem('nilkamal_mock_goals');
      const parsed = saved ? JSON.parse(saved) : [];
      parsed.sort((a, b) => a.pointsRequired - b.pointsRequired);
      setGoals(parsed);
      setLoadingGoals(false);
      return;
    }

    try {
      const goalsRef = collection(db, 'goals');
      const querySnapshot = await getDocs(goalsRef);
      const goalsList = [];
      querySnapshot.forEach((doc) => {
        goalsList.push({ id: doc.id, ...doc.data() });
      });
      goalsList.sort((a, b) => a.pointsRequired - b.pointsRequired);
      setGoals(goalsList);
    } catch (err) {
      console.error("Error loading goals:", err);
      const saved = localStorage.getItem('nilkamal_mock_goals');
      const parsed = saved ? JSON.parse(saved) : [];
      parsed.sort((a, b) => a.pointsRequired - b.pointsRequired);
      setGoals(parsed);
    } finally {
      setLoadingGoals(false);
    }
  };

  const loadRedemptions = async () => {
    setLoadingRedemptions(true);
    if (isMock) {
      const saved = localStorage.getItem('nilkamal_mock_redemptions');
      const mockRedemptions = saved ? JSON.parse(saved) : [];
      const filtered = mockRedemptions.filter(r => r.contractorId === user.uid);
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      setRedemptions(filtered);
      setLoadingRedemptions(false);
      return;
    }

    try {
      const redemptionsRef = collection(db, 'redemptions');
      const q = query(redemptionsRef, where('contractorId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const redemptionsList = [];
      querySnapshot.forEach((doc) => {
        redemptionsList.push({ id: doc.id, ...doc.data() });
      });
      redemptionsList.sort((a, b) => {
        const t1 = a.timestamp?.seconds || a.timestamp || 0;
        const t2 = b.timestamp?.seconds || b.timestamp || 0;
        return t2 - t1;
      });
      setRedemptions(redemptionsList);
    } catch (err) {
      console.error("Error loading redemptions:", err);
      const saved = localStorage.getItem('nilkamal_mock_redemptions');
      const mockRedemptions = saved ? JSON.parse(saved) : [];
      setRedemptions(mockRedemptions.filter(r => r.contractorId === user.uid));
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleSelectGoal = async (goal) => {
    try {
      await updateActiveGoal(user.uid, goal);
    } catch (err) {
      console.error("Error setting active goal:", err);
    }
  };

  const handleRedeemPrize = async () => {
    const activeGoal = userData?.activeGoal;
    if (!activeGoal) return;
    
    const currentPoints = userData?.totalPoints || 0;
    if (currentPoints < activeGoal.pointsRequired) {
      alert(language === 'en' ? "Insufficient points to redeem this prize!" : "इस इनाम को रिडीम करने के लिए अपर्याप्त पॉइंट्स!");
      return;
    }

    setRedeeming(true);
    
    const newRedemption = {
      contractorId: user.uid,
      contractorName: userData?.name || 'Contractor',
      goalName: activeGoal.name,
      pointsSpent: activeGoal.pointsRequired,
      status: 'requested',
      timestamp: Date.now()
    };

    if (isMock) {
      // 1. Deduct points
      await updateContractorPoints(user.uid, -activeGoal.pointsRequired);

      // 2. Add redemption to localStorage
      const savedRedemptions = localStorage.getItem('nilkamal_mock_redemptions');
      const allRedemptions = savedRedemptions ? JSON.parse(savedRedemptions) : [];
      allRedemptions.push({
        id: 'mock-redeem-' + Date.now(),
        ...newRedemption
      });
      localStorage.setItem('nilkamal_mock_redemptions', JSON.stringify(allRedemptions));

      // 3. Clear active goal
      await updateActiveGoal(user.uid, null);

      // 4. Update contractor last transaction
      await updateContractorTransaction(user.uid, `Redeemed prize: ${activeGoal.name}`);

      setTimeout(() => {
        setRedeeming(false);
        setRedeemSuccess(true);
        loadRedemptions();
        setTimeout(() => setRedeemSuccess(false), 3000);
      }, 1000);
      return;
    }

    try {
      // 1. Deduct points in Firestore
      await updateContractorPoints(user.uid, -activeGoal.pointsRequired);

      // 2. Create redemption document in Firestore
      const redemptionsRef = collection(db, 'redemptions');
      await addDoc(redemptionsRef, {
        ...newRedemption,
        timestamp: new Date()
      });

      // 3. Clear active goal in user profile
      await updateActiveGoal(user.uid, null);

      // 4. Update contractor last transaction
      await updateContractorTransaction(user.uid, `Redeemed prize: ${activeGoal.name}`);

      setRedeeming(false);
      setRedeemSuccess(true);
      loadRedemptions();
      setTimeout(() => setRedeemSuccess(false), 3000);
    } catch (err) {
      console.error("Error completing redemption flow:", err);
      alert(language === 'en' ? "Redemption failed. Please check connection." : "मोचन विफल रहा। कृपया कनेक्शन की जांच करें।");
      setRedeeming(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClaims();
      loadGoals();
      loadRedemptions();
    }
  }, [user, isMock]);

  // Handle Image Change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBillImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Claim
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    if (!amount || !runningFeet) return;
    
    setUploading(true);
    const billAmt = parseFloat(amount);
    const rftVal = parseFloat(runningFeet);
    // 1 point per 1 running foot (RFT)
    const calculatedPoints = Math.round(rftVal); 

    const newClaim = {
      contractorId: user.uid,
      contractorName: userData?.name || 'Contractor',
      billNumber: billNumber || 'NIL/' + Math.floor(Math.random() * 900000 + 100000),
      amount: billAmt,
      runningFeet: rftVal,
      points: calculatedPoints,
      imageUrl: billImagePreview || '',
      status: 'pending',
      timestamp: Date.now(),
      billDate: billDate || new Date().toISOString().split('T')[0]
    };

    if (isMock) {
      // Save to localStorage
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const allClaims = savedClaims ? JSON.parse(savedClaims) : [];
      allClaims.push(newClaim);
      localStorage.setItem('nilkamal_mock_claims', JSON.stringify(allClaims));

      await updateContractorTransaction(user.uid, `Submitted Bill ${newClaim.billNumber}`);

      // Simulate network delay
      setTimeout(() => {
        setUploading(false);
        setSubmitSuccess(true);
        setBillNumber('');
        setAmount('');
        setRunningFeet('');
        setBillDate(new Date().toISOString().split('T')[0]);
        setBillImage(null);
        setBillImagePreview(null);
        loadClaims();
        setTimeout(() => {
          setSubmitSuccess(false);
          setShowUploadModal(false);
        }, 1500);
      }, 800);
      return;
    }

    try {
      const claimsRef = collection(db, 'claims');
      await addDoc(claimsRef, {
        ...newClaim,
        timestamp: new Date()
      });
      await updateContractorTransaction(user.uid, `Submitted Bill ${newClaim.billNumber}`);
      setUploading(false);
      setSubmitSuccess(true);
      setBillNumber('');
      setAmount('');
      setRunningFeet('');
      setBillDate(new Date().toISOString().split('T')[0]);
      setBillImage(null);
      setBillImagePreview(null);
      loadClaims();
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowUploadModal(false);
      }, 1500);
    } catch (err) {
      console.error("Error submitting claim to Firestore:", err);
      alert(language === 'en' ? "Error uploading claim to database. Using offline fallback." : "डेटाबेस में बिल अपलोड करने में त्रुटि। ऑफ़लाइन बैकअप का उपयोग किया जा रहा है।");
      // Fallback mock upload
      const savedClaims = localStorage.getItem('nilkamal_mock_claims') || '[]';
      const allClaims = JSON.parse(savedClaims);
      allClaims.push(newClaim);
      localStorage.setItem('nilkamal_mock_claims', JSON.stringify(allClaims));
      await updateContractorTransaction(user.uid, `Submitted Bill ${newClaim.billNumber}`);
      setUploading(false);
      setSubmitSuccess(true);
      setBillNumber('');
      setAmount('');
      setRunningFeet('');
      setBillDate(new Date().toISOString().split('T')[0]);
      setBillImage(null);
      setBillImagePreview(null);
      loadClaims();
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowUploadModal(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-24">
      {/* Header */}
      <header className="bg-brand-dark text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div>
          <span className="text-brand-blue font-extrabold text-lg uppercase tracking-wider">Nilkamal</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest -mt-1">
            {language === 'en' ? 'Loyalty App' : 'लॉयल्टी ऐप'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Language Toggle */}
          <div className="flex bg-slate-800 p-0.5 rounded-full border border-slate-700">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                language === 'en' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                language === 'hi' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              हिं
            </button>
          </div>

          <span className="text-xs font-bold bg-slate-800 px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-200">
            👤 {userData?.name?.split(' ')[0] || (language === 'en' ? 'Contractor' : 'ठेकेदार')}
          </span>
          <button 
            onClick={logout}
            className="p-1.5 bg-red-950 text-red-400 rounded-lg border border-red-900 active:scale-95 transition-all cursor-pointer"
            title={language === 'en' ? 'Log Out' : 'लॉग आउट'}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content (Mobile Optimized) */}
      <main className="max-w-md w-full mx-auto p-4 flex-1 flex flex-col gap-6">
        
        {activeTab === 'dashboard' && (
          <>
            {/* Points Display - GIGANTIC */}
            <div className="bg-gradient-to-br from-brand-dark to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-blue/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl"></div>
              
              <div className="flex justify-center mb-2">
                <Award className="w-12 h-12 text-yellow-400 animate-bounce" />
              </div>
              
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t.totalPoints}</p>
              <h2 className="text-6xl font-black text-white mt-1 tracking-tight drop-shadow-md">
                {(userData?.totalPoints || 0).toLocaleString()}
              </h2>
              <p className="text-[10px] text-brand-blue font-bold uppercase tracking-widest mt-2">{t.subPoints}</p>
            </div>

            {/* Active Goal Progress Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 text-center">
                {t.activeGoalProgress}
              </h3>
              
              {redeemSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-200">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <h4 className="text-xl font-black text-slate-800 uppercase">{t.redemptionSuccess}</h4>
                  <p className="text-xs text-slate-500 font-semibold">{t.redemptionSuccessSub}</p>
                </div>
              ) : userData?.activeGoal ? (
                <div className="space-y-4">
                  {/* Goal Details Row */}
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {userData.activeGoal.imageUrl ? (
                        <img src={userData.activeGoal.imageUrl} alt={userData.activeGoal.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-extrabold text-slate-800 text-base leading-tight">{userData.activeGoal.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {t.target}: <span className="text-brand-blue">{userData.activeGoal.pointsRequired.toLocaleString()} {t.pts}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Tracker Info */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-600 uppercase">
                      <span>{Math.min(Math.round(((userData?.totalPoints || 0) / userData.activeGoal.pointsRequired) * 100), 100)}% {t.complete}</span>
                      <span>{(userData?.totalPoints || 0).toLocaleString()} / {userData.activeGoal.pointsRequired.toLocaleString()} {t.pts}</span>
                    </div>
                    
                    {/* The Progress Bar - Nilkamal Blue #0093DD */}
                    <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                      <div 
                        className="h-full bg-brand-blue rounded-full transition-all duration-500 shadow-md shadow-brand-blue/15"
                        style={{ width: `${Math.min(Math.round(((userData?.totalPoints || 0) / userData.activeGoal.pointsRequired) * 100), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Redeem Button - pulsing large target */}
                  {(userData?.totalPoints || 0) >= userData.activeGoal.pointsRequired ? (
                    <button
                      type="button"
                      onClick={handleRedeemPrize}
                      disabled={redeeming}
                      className="w-full py-4 px-6 bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white rounded-2xl text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xl shadow-green-600/10 hover:shadow-green-600/20 animate-pulse border-2 border-white"
                    >
                      {redeeming ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Award className="w-5 h-5" />
                          <span>{t.redeemPrizeNow}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-amber-500/10 border-2 border-amber-400/40 rounded-2xl p-4 text-center shadow-lg shadow-amber-500/5 animate-blink-highlight">
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">
                        {t.goalFocus}
                      </span>
                      <p className="text-sm font-extrabold text-slate-700 leading-snug">
                        {t.goalFocusText.split('{points}')[0]}
                        <span className="text-lg font-black text-brand-blue">
                          {(userData.activeGoal.pointsRequired - (userData?.totalPoints || 0)).toLocaleString()}
                        </span>
                        {t.goalFocusText.split('{points}')[1]}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                        {t.uploadMoreBills}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 space-y-2">
                  <p className="text-sm font-bold">{t.noActiveGoal}</p>
                  <p className="text-xs text-slate-400">{t.noActiveGoalSub}</p>
                </div>
              )}
            </div>

            {/* Upload Button - MASSIVE */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full bg-brand-blue hover:bg-brand-blue/95 active:scale-[0.97] text-white rounded-3xl p-8 shadow-xl shadow-brand-blue/20 hover:shadow-brand-blue/30 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer border-4 border-white mb-4"
            >
              <div className="bg-white/20 p-4 rounded-full">
                <Plus className="w-14 h-14 text-white stroke-[3.5]" />
              </div>
              <span className="text-2xl font-black tracking-wide uppercase text-white">
                {t.uploadNewBill}
              </span>
              <span className="text-xs font-semibold text-brand-blue-50/80 bg-brand-dark/20 px-4 py-1 rounded-full uppercase tracking-wider -mt-1">
                {t.tapToUpload}
              </span>
            </button>
          </>
        )}

        {activeTab === 'rewards' && (
          /* Rewards Catalog */
          <div className="space-y-3">
            <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-blue" />
              <span>{t.rewardsCatalog}</span>
            </h3>
            
            {loadingGoals ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-sm font-semibold">
                {t.loadingCatalog}
              </div>
            ) : goals.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
                <p className="text-base font-bold">{t.noRewardsYet}</p>
                <p className="text-xs text-slate-400">{t.askAdminRewards}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map((g) => {
                  const isSelectedGoal = userData?.activeGoal && userData.activeGoal.name === g.name;
                  return (
                    <div key={g.id || g.name} className="bg-white rounded-2xl overflow-hidden border border-slate-200 flex flex-col shadow-sm">
                      {/* Goal Image */}
                      <div className="h-40 bg-slate-50 border-b border-slate-150 flex items-center justify-center overflow-hidden relative">
                        {g.imageUrl ? (
                          <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-slate-400" />
                        )}
                        <span className="absolute top-2 right-2 bg-brand-dark/85 backdrop-blur-sm text-brand-blue text-[10px] font-black px-2.5 py-1 rounded-full border border-brand-blue/30 uppercase tracking-wider">
                          {g.pointsRequired.toLocaleString()} {t.pts}
                        </span>
                      </div>
                      {/* Goal Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm leading-snug line-clamp-2">{g.name}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectGoal(g)}
                          disabled={isSelectedGoal}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isSelectedGoal
                              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 pointer-events-none'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
                          }`}
                        >
                          {isSelectedGoal ? t.currentGoal : t.setAsGoal}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <>
            {/* Past Claims History Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" />
                <span>{t.yourSubmittedBills}</span>
              </h3>

              {loadingClaims ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-sm font-semibold">
                  {t.loadingBillHistory}
                </div>
              ) : claims.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
                  <p className="text-base font-bold">{t.noBillsUploaded}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.submitFirstBill}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.slice(0, 10).map((claim, idx) => (
                    <div 
                      key={claim.id || idx}
                      className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        {/* Tiny Bill Photo Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {claim.imageUrl ? (
                            <img src={claim.imageUrl} alt="Bill" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">{claim.billNumber}</h4>
                          <p className="text-xs text-slate-500 font-semibold">
                            {t.amt}: ₹{claim.amount.toLocaleString()} | {claim.runningFeet || 0} {t.rft}
                          </p>
                          {claim.billDate && (
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {t.date}: {formatDate(claim.billDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Status & Point Earnings */}
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 block">
                          +{claim.points} {t.pts}
                        </span>
                        {claim.status === 'approved' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />{t.approved}
                          </span>
                        )}
                        {claim.status === 'rejected' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <AlertCircle className="w-2.5 h-2.5" />{t.rejected}
                          </span>
                        )}
                        {claim.status === 'pending' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-2.5 h-2.5" />{t.waiting}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Redemption History */}
            <div className="space-y-3 mt-4">
              <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-blue" />
                <span>{t.redemptionHistory}</span>
              </h3>

              {loadingRedemptions ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-sm font-semibold">
                  {t.loadingRedemptionHistory}
                </div>
              ) : redemptions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
                  <p className="text-base font-bold">{t.noRedemptionsYet}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.completeGoalRedeem}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {redemptions.map((r, idx) => (
                    <div 
                      key={r.id || idx}
                      className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{r.goalName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            {t.spent}: {r.pointsSpent.toLocaleString()} {t.pts} | {t.date}: {formatDate(r.timestamp)}
                          </p>
                        </div>
                        
                        {/* Status Badge */}
                        <div>
                          {r.status === 'delivered' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />{t.delivered}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-2.5 h-2.5" />{t.requested}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delivery Photo Link / Thumbnail */}
                      {r.deliveryImageUrl && (
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-150">
                          <button
                            type="button"
                            onClick={() => setSelectedDeliveryProof(r.deliveryImageUrl)}
                            className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-zoom-in relative group"
                          >
                            <img src={r.deliveryImageUrl} alt="Delivery Proof Thumbnail" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-[8px] font-bold">
                              VIEW
                            </div>
                          </button>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{t.handedOver}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedDeliveryProof(r.deliveryImageUrl)}
                              className="text-[10px] font-black text-brand-blue uppercase hover:underline cursor-pointer"
                            >
                              {t.viewDeliveryPhoto}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-250 py-2.5 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-25 flex justify-around max-w-md mx-auto rounded-t-3xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'dashboard' ? 'text-brand-blue font-black scale-105' : 'text-slate-400 hover:text-slate-500 font-bold'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.tabDashboard}</span>
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'rewards' ? 'text-brand-blue font-black scale-105' : 'text-slate-400 hover:text-slate-500 font-bold'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.tabRewards}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'history' ? 'text-brand-blue font-black scale-105' : 'text-slate-400 hover:text-slate-500 font-bold'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.tabHistory}</span>
        </button>
      </div>

      {/* Bill Upload Modal (GIGANTIC MODAL FOR CONTRACTORS) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-brand-dark text-white p-5 flex justify-between items-center border-b border-slate-800">
              <h3 className="text-lg font-black uppercase tracking-wider">{t.newBillUpload}</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-white cursor-pointer active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitClaim} className="p-6 overflow-y-auto space-y-4 flex-1">
              {submitSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto border-2 border-green-200">
                    <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-800 uppercase">{t.submitted}</h4>
                  <p className="text-sm font-semibold text-slate-500">{t.waitApproval}</p>
                </div>
              ) : (
                <>
                  {/* Photo Upload Area - COMPACT */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                      {t.takePhoto}
                    </label>
                    <div className="relative">
                      {billImagePreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-brand-blue max-h-28 flex justify-center bg-slate-900">
                          <img src={billImagePreview} alt="Bill Preview" className="max-h-28 object-contain" />
                          <button
                            type="button"
                            onClick={() => {
                              setBillImage(null);
                              setBillImagePreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-20 border-2 border-dashed border-slate-300 hover:border-brand-blue rounded-xl flex flex-row items-center justify-center gap-3 cursor-pointer transition-all bg-slate-50 hover:bg-brand-blue/5 p-3">
                          <Camera className="w-6 h-6 text-slate-400 stroke-[2]" />
                          <div className="text-left">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-wide block">
                              {t.openCamera}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{t.imageFormat}</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Running Feet - HUGE INPUT (Point Determinant) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                      {t.enterRft}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={runningFeet}
                        onChange={(e) => setRunningFeet(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 text-xl font-black focus:outline-none transition-all placeholder:text-slate-300"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {runningFeet && (
                      <div className="mt-2 bg-brand-blue/10 border border-brand-blue/20 rounded-xl p-2.5 text-center shadow-inner">
                        <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest block mb-0.5">{t.estPoints}</span>
                        <span className="text-xl font-black text-slate-900 block">+{Math.round(parseFloat(runningFeet) || 0)} {t.pts}</span>
                      </div>
                    )}
                  </div>

                  {/* Bill Amount - HUGE INPUT */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                      {t.enterAmt}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-xl font-black text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 text-xl font-black focus:outline-none transition-all placeholder:text-slate-300"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Bill Date - REQUIRED */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                      {t.billDateLabel}
                    </label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 font-bold focus:outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Submit Button - HUGE */}
                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-green-600 hover:bg-green-500 active:scale-95 text-white font-black py-3.5 px-6 rounded-xl shadow-xl shadow-green-700/10 hover:shadow-green-700/20 text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-75"
                  >
                    {uploading ? (
                      <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6" />
                        <span>{t.sendBillNow}</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delivery Photo Viewer Modal */}
      {selectedDeliveryProof && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="bg-brand-dark text-white p-5 flex justify-between items-center">
              <h4 className="font-extrabold text-base uppercase tracking-wider">{t.proofOfDelivery}</h4>
              <button 
                onClick={() => setSelectedDeliveryProof(null)}
                className="p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-white cursor-pointer active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-[300px]">
              <img 
                src={selectedDeliveryProof} 
                alt="Delivery Proof" 
                className="max-h-[50vh] w-full object-contain rounded-2xl border border-slate-200 shadow-sm"
              />
              <p className="mt-4 text-xs text-slate-500 font-semibold uppercase tracking-wider text-center">
                {t.proofOfDeliverySub}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
