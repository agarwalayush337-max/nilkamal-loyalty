import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Plus, Image as ImageIcon, Camera, X, Award, FileText, CheckCircle2, AlertCircle, Clock, LayoutDashboard, Gift, History, Mic, Megaphone } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

const translations = {
  en: {
    // Tabs
    tabDashboard: "Dashboard",
    tabRewards: "Rewards",
    tabHistory: "History",
    tabUpdates: "Updates",
    
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
    placeOpt: "4. Place / Location (Optional)",
    placePlaceholder: "e.g. Kashipur",
    billNumOpt: "5. Bill Number (Optional)",
    billDateLabel: "6. Bill Date *",
    sendBillNow: "Send Bill Now",
    submitted: "SUBMITTED!",
    waitApproval: "Wait for master approval to get points."
  },
  hi: {
    // Tabs
    tabDashboard: "डैशबोर्ड",
    tabRewards: "इनाम",
    tabHistory: "इतिहास",
    tabUpdates: "अपडेट्स",
    
    // Dashboard / Points
    totalPoints: "आपके कुल पॉइंट्स",
    subPoints: "नीलकमल कॉन्ट्रैक्टर रिवॉर्ड पॉइंट्स",
    
    // Active Goal Progress
    activeGoalProgress: "🎯 एक्टिव गोल प्रोग्रेस",
    redemptionSuccess: "रिडेम्पशन सफल!",
    redemptionSuccessSub: "आपका रिवॉर्ड रिक्वेस्ट एडमिन को भेज दिया गया है।",
    target: "टारगेट",
    pts: "पॉइंट्स",
    complete: "कम्पलीट",
    redeemPrizeNow: "अभी इनाम रिडीम करें",
    goalFocus: "🎯 गोल फोकस",
    goalFocusText: "आपको अपना इनाम पाने के लिए केवल {points} और पॉइंट्स चाहिए!",
    uploadMoreBills: "पॉइंट्स इकट्ठा करने के लिए और बिल अपलोड करें",
    noActiveGoal: "कोई एक्टिव गोल नहीं चुना गया।",
    noActiveGoalSub: "गोल सेट करने और प्रोग्रेस ट्रैक करने के लिए नीचे कैटलॉग से एक इनाम चुनें!",
    
    // Upload Button
    uploadNewBill: "नया बिल अपलोड करें",
    tapToUpload: "कैमरा खोलने और अपलोड करने के लिए टैप करें",
    
    // Rewards Catalog
    rewardsCatalog: "रिवॉर्ड्स कैटलॉग",
    loadingCatalog: "रिवॉर्ड्स कैटलॉग लोड हो रहा है...",
    noRewardsYet: "अभी तक कोई इनाम नहीं जोड़ा गया है।",
    askAdminRewards: "एडमिन से इनाम बनाने के लिए कहें!",
    currentGoal: "🎯 एक्टिव गोल",
    setAsGoal: "गोल सेट करें",
    
    // Submitted Bills
    yourSubmittedBills: "आपके सबमिट किए गए बिल",
    loadingBillHistory: "बिल इतिहास लोड हो रहा है...",
    noBillsUploaded: "अभी तक कोई बिल अपलोड नहीं किया गया है।",
    submitFirstBill: "पॉइंट्स कमाने के लिए ऊपर अपना पहला बिल सबमिट करें!",
    billNumber: "बिल नंबर",
    amt: "बिल अमाउंट",
    rft: "रनिंग फीट (RFT)",
    approved: "अप्रूव्ड",
    rejected: "रिजेक्टेड",
    waiting: "वेटिंग",
    
    // Redemption History
    redemptionHistory: "रिडेम्पशन हिस्ट्री",
    loadingRedemptionHistory: "रिडेम्पशन हिस्ट्री लोड हो रहा है...",
    noRedemptionsYet: "अभी तक कोई रिडेम्पशन रिक्वेस्ट नहीं की गई है।",
    completeGoalRedeem: "इनाम रिडीम करने के लिए गोल पूरा करें!",
    spent: "खर्च किए गए",
    date: "डेट",
    delivered: "डिलिवर्ड",
    requested: "रिक्वेस्टेड",
    handedOver: "हैंडओवर किया गया",
    viewDeliveryPhoto: "डिलिवरी फोटो देखें",
    proofOfDelivery: "डिलिवरी प्रूफ",
    proofOfDeliverySub: "यह आइटम एडमिन द्वारा सफलतापूर्वक डिलीवर कर दिया गया है।",
    
    // Upload Modal
    newBillUpload: "नया बिल अपलोड",
    takePhoto: "1. बिल का फोटो लें (वैकल्पिक)",
    openCamera: "कैमरा खोलें / अपलोड करें",
    imageFormat: "JPEG या PNG इमेज",
    enterRft: "2. रनिंग फीट (RFT) दर्ज करें *",
    estPoints: "अर्जित करने के लिए अनुमानित पॉइंट्स",
    noteRft: "नोट: आप प्रत्येक 1 रनिंग फुट (RFT) के लिए ठीक 1 पॉइंट अर्जित करते हैं।",
    enterAmt: "3. बिल अमाउंट (₹) दर्ज करें *",
    placeOpt: "4. जगह / लोकेशन (वैकल्पिक)",
    placePlaceholder: "उदा. काशीपुर",
    billNumOpt: "5. बिल नंबर (वैकल्पिक)",
    billDateLabel: "6. बिल डेट *",
    sendBillNow: "अभी बिल भेजें",
    submitted: "सबमिट हो गया!",
    waitApproval: "पॉइंट्स पाने के लिए एडमिन की मंजूरी का इंतजार करें।"
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

const formatDateTime = (timestamp) => {
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
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
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
  const [place, setPlace] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billImage, setBillImage] = useState(null);
  const [billImagePreview, setBillImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Speech-to-Text States
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [listeningError, setListeningError] = useState('');

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  // Refs to prevent duplicate notifications
  const notifiedIdsRef = useRef(new Set());
  const firstNotificationsLoadRef = useRef(true);

  // Claims history state
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // Phase 3 States
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [redemptions, setRedemptions] = useState([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [selectedDeliveryProof, setSelectedDeliveryProof] = useState(null);

  // Refs for tracking old states to show Toast notifications
  const prevClaimsRef = useRef([]);
  const prevRedemptionsRef = useRef([]);

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

  // Load mock notifications for Mock Mode
  const loadNotifications = () => {
    if (!user) return;
    try {
      const saved = localStorage.getItem('nilkamal_mock_notifications');
      const allNotifs = saved ? JSON.parse(saved) : [];
      const myNotifs = allNotifs.filter(n => n.contractorId === user.uid);
      
      myNotifs.forEach(notif => {
        if (!notifiedIdsRef.current.has(notif.id)) {
          notifiedIdsRef.current.add(notif.id);
          if (!firstNotificationsLoadRef.current) {
            showNotification(notif.title, notif.message);
          }
        }
      });
    } catch (err) {
      console.error("Error loading mock notifications:", err);
    } finally {
      firstNotificationsLoadRef.current = false;
    }
  };

  // Load mock announcements for Mock Mode
  const loadAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const saved = localStorage.getItem('nilkamal_mock_announcements');
      const allAnn = saved ? JSON.parse(saved) : [];
      allAnn.sort((a, b) => b.timestamp - a.timestamp);
      setAnnouncements(allAnn);
    } catch (err) {
      console.error("Error loading mock announcements:", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const showNotification = (title, message) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body: message });
      } catch (err) {
        console.error("Browser notification failed:", err);
      }
    }
  };

  const parseHindiSpeech = (transcript) => {
    const lowercase = transcript.toLowerCase();
    let parsedRft = '';
    let parsedPlace = '';
    let parsedDate = '';
    let parsedAmount = '';

    const rftRegex = /(\d+(?:\.\d+)?)\s*(?:ft|feet|fit|rft|r\s*feet|रनिंग\s*(?:फीट|फिट|फुट)|फीट|फिट|फुट|रनिंग\s*फीट)/i;
    const rftMatch = lowercase.match(rftRegex);
    if (rftMatch) {
      parsedRft = rftMatch[1];
    } else {
      const malRegex = /(\d+(?:\.\d+)?)\s*(?:maal|mal|माल|मॉल)/i;
      const malMatch = lowercase.match(malRegex);
      if (malMatch) {
        parsedRft = malMatch[1];
      }
    }

    const amountRegex = /(\d+(?:\.\d+)?)\s*(?:rupaye|rupee|rupees|rupe|rs|रुपये|रुपए|रुपया|रू|रूपए)/i;
    const amountMatch = lowercase.match(amountRegex);
    if (amountMatch) {
      parsedAmount = amountMatch[1];
    }

    const dateRegex = /(\d{1,2})\s*(?:tarik|tarikh|tariq|तारीख|तारीक|तारीख़|तारीक़|तारिक)/i;
    const dateMatch = lowercase.match(dateRegex);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      if (day >= 1 && day <= 31) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        parsedDate = `${year}-${month}-${dayStr}`;
      }
    }

    const stopWords = ['ka', 'se', 'ki', 'ko', 'party', 'maal', 'mal', 'lia', 'hai', 'tha', 'ft', 'feet', 'fit', 'rft', 'tarik', 'tarikh', 'tariq', 'hi', 'in', 'का', 'से', 'की', 'को', 'पार्टी', 'माल', 'लिया', 'है', 'था', 'फीट', 'फिट', 'फुट', 'तारीख', 'तारीक', 'तारीख़', 'तारीक़', 'तारिक'];
    const tokens = lowercase.split(/[\s,\.\?।]+/);
    const indicators = ['ka', 'se', 'party', 'का', 'से', 'पार्टी'];
    for (let i = 0; i < tokens.length; i++) {
      if (indicators.includes(tokens[i]) && i > 0) {
        const candidate = tokens[i - 1];
        if (candidate && !stopWords.includes(candidate) && !/\d/.test(candidate) && candidate.length > 2) {
          parsedPlace = candidate;
          break;
        }
      }
    }

    if (!parsedPlace) {
      for (const token of tokens) {
        if (token && !stopWords.includes(token) && !/\d/.test(token) && token.length > 2) {
          parsedPlace = token;
          break;
        }
      }
    }

    if (parsedPlace && /^[a-z]+$/.test(parsedPlace)) {
      parsedPlace = parsedPlace.charAt(0).toUpperCase() + parsedPlace.slice(1);
    }

    return {
      rft: parsedRft,
      amount: parsedAmount,
      date: parsedDate,
      place: parsedPlace
    };
  };

  const startSpeechRecognition = () => {
    setListeningError('');
    setVoiceTranscript('');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setListeningError(language === 'en' ? 'Speech recognition is not supported in this browser.' : 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है।');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setListeningError(language === 'en' ? 'Error during listening: ' + event.error : 'सुनने के दौरान त्रुटि: ' + event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcriptText = event.results[0][0].transcript;
      setVoiceTranscript(transcriptText);

      const parsed = parseHindiSpeech(transcriptText);
      if (parsed.rft) setRunningFeet(parsed.rft);
      if (parsed.amount) setAmount(parsed.amount);
      if (parsed.place) setPlace(parsed.place);
      if (parsed.date) setBillDate(parsed.date);
    };

    recognition.start();
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

  // Notification permissions request on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Clear notification flags on user change
  useEffect(() => {
    if (notifiedIdsRef.current) notifiedIdsRef.current.clear();
    firstNotificationsLoadRef.current = true;
  }, [user]);

  // Real-time updates effect
  useEffect(() => {
    if (!user) return;

    if (isMock) {
      // Mock mode initial load
      loadClaims();
      loadGoals();
      loadRedemptions();
      loadAnnouncements();
      loadNotifications();

      // Listen to local changes
      const handleMockUpdate = () => {
        loadClaims();
        loadGoals();
        loadRedemptions();
        loadAnnouncements();
        loadNotifications();
      };
      
      const handleStorageUpdate = (e) => {
        if (e.key && e.key.startsWith('nilkamal_mock_')) {
          handleMockUpdate();
        }
      };

      window.addEventListener('nilkamal_mock_db_update', handleMockUpdate);
      window.addEventListener('storage', handleStorageUpdate);
      return () => {
        window.removeEventListener('nilkamal_mock_db_update', handleMockUpdate);
        window.removeEventListener('storage', handleStorageUpdate);
      };
    } else {
      // Firebase real-time listeners
      setLoadingClaims(true);
      const claimsRef = collection(db, 'claims');
      const claimsQ = query(claimsRef, where('contractorId', '==', user.uid));
      const unsubscribeClaims = onSnapshot(claimsQ, (snapshot) => {
        const claimsList = [];
        snapshot.forEach((doc) => {
          claimsList.push({ id: doc.id, ...doc.data() });
        });
        claimsList.sort((a, b) => {
          const t1 = a.timestamp?.seconds || a.timestamp || 0;
          const t2 = b.timestamp?.seconds || b.timestamp || 0;
          return t2 - t1;
        });
        setClaims(claimsList);
        setLoadingClaims(false);
      }, (err) => {
        console.error("Claims listener error:", err);
        setLoadingClaims(false);
      });

      setLoadingGoals(true);
      const goalsRef = collection(db, 'goals');
      const unsubscribeGoals = onSnapshot(goalsRef, (snapshot) => {
        const goalsList = [];
        snapshot.forEach((doc) => {
          goalsList.push({ id: doc.id, ...doc.data() });
        });
        goalsList.sort((a, b) => a.pointsRequired - b.pointsRequired);
        setGoals(goalsList);
        setLoadingGoals(false);
      }, (err) => {
        console.error("Goals listener error:", err);
        setLoadingGoals(false);
      });

      setLoadingRedemptions(true);
      const redemptionsRef = collection(db, 'redemptions');
      const redemptionsQ = query(redemptionsRef, where('contractorId', '==', user.uid));
      const unsubscribeRedemptions = onSnapshot(redemptionsQ, (snapshot) => {
        const redemptionsList = [];
        snapshot.forEach((doc) => {
          redemptionsList.push({ id: doc.id, ...doc.data() });
        });
        redemptionsList.sort((a, b) => {
          const t1 = a.timestamp?.seconds || a.timestamp || 0;
          const t2 = b.timestamp?.seconds || b.timestamp || 0;
          return t2 - t1;
        });
        setRedemptions(redemptionsList);
        setLoadingRedemptions(false);
      }, (err) => {
        console.error("Redemptions listener error:", err);
        setLoadingRedemptions(false);
      });

      setLoadingAnnouncements(true);
      const announcementsRef = collection(db, 'announcements');
      const unsubscribeAnnouncements = onSnapshot(announcementsRef, (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        list.sort((a, b) => {
          const t1 = a.timestamp?.seconds || a.timestamp || 0;
          const t2 = b.timestamp?.seconds || b.timestamp || 0;
          return t2 - t1;
        });
        setAnnouncements(list);
        setLoadingAnnouncements(false);
      }, (err) => {
        console.error("Announcements listener error:", err);
        setLoadingAnnouncements(false);
      });

      // Firebase notifications listener
      const notificationsRef = collection(db, 'notifications');
      const notificationsQ = query(notificationsRef, where('contractorId', '==', user.uid));
      
      let isInitial = true;
      const unsubscribeNotifications = onSnapshot(notificationsQ, (snapshot) => {
        if (!isInitial) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              showNotification(data.title, data.message);
            }
          });
        }
        isInitial = false;
      });

      return () => {
        unsubscribeClaims();
        unsubscribeGoals();
        unsubscribeRedemptions();
        unsubscribeAnnouncements();
        unsubscribeNotifications();
      };
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
      billDate: billDate || new Date().toISOString().split('T')[0],
      place: place.trim()
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
        setPlace('');
        setVoiceTranscript('');
        setListeningError('');
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
      setPlace('');
      setVoiceTranscript('');
      setListeningError('');
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
      setPlace('');
      setVoiceTranscript('');
      setListeningError('');
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
    <div className={`min-h-screen bg-slate-100 flex flex-col pb-24 ${language === 'hi' ? 'lang-hi' : ''}`}>
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

      {/* Main Content (Strict 30/40/30 Ratio Layout) */}
      <main className={`max-w-md w-full mx-auto ${
        activeTab === 'dashboard' 
          ? 'h-[calc(100dvh-130px)] flex flex-col px-4 pt-3 pb-2 gap-3 overflow-hidden' 
          : 'p-4 pb-28 flex-1 flex flex-col gap-6'
      }`}>
        
        {activeTab === 'dashboard' && (
          <>
            {/* TOP BOX - 30% (flex-[3]) */}
            <div className="flex-[2.5] w-full bg-gradient-to-br from-brand-dark to-slate-900 text-white rounded-3xl p-4 shadow-xl border border-slate-800 flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-blue/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl"></div>
              
              <div className="mb-1 sm:mb-2 relative z-10">
                <Award className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 animate-bounce" />
              </div>
              
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 relative z-10 whitespace-nowrap">{t.totalPoints}</p>
              <h2 className="text-4xl sm:text-5xl font-black text-white mt-1 tracking-tight drop-shadow-md relative z-10">
                {(userData?.totalPoints || 0).toLocaleString()}
              </h2>
              <p className="text-[9px] text-brand-blue font-bold uppercase tracking-widest mt-1 relative z-10 whitespace-nowrap">{t.subPoints}</p>
            </div>

            {/* MIDDLE BOX - 40% (flex-[4]) */}
            <div className="flex-[4] w-full bg-white rounded-3xl p-4 shadow-xl border border-slate-200 flex flex-col justify-center overflow-hidden">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 mb-2 text-center shrink-0">
                {t.activeGoalProgress}
              </h3>
              
              {redeemSuccess ? (
                <div className="text-center space-y-2 flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center border border-green-200">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 uppercase">{t.redemptionSuccess}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold">{t.redemptionSuccessSub}</p>
                </div>
              ) : userData?.activeGoal ? (
                <div className="flex flex-col h-full justify-evenly">
                  {/* Goal Details Row */}
                  <div className="flex gap-3 items-center shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {userData.activeGoal.imageUrl ? (
                        <img src={userData.activeGoal.imageUrl} alt={userData.activeGoal.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-sm leading-tight truncate">{userData.activeGoal.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {t.target}: <span className="text-brand-blue">{userData.activeGoal.pointsRequired.toLocaleString()} {t.pts}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Tracker Info */}
                  <div className="space-y-1 mt-2 shrink-0">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase">
                      <span>{Math.min(Math.round(((userData?.totalPoints || 0) / userData.activeGoal.pointsRequired) * 100), 100)}% {t.complete}</span>
                      <span>{(userData?.totalPoints || 0).toLocaleString()} / {userData.activeGoal.pointsRequired.toLocaleString()} {t.pts}</span>
                    </div>
                    {/* The Progress Bar */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                      <div 
                        className="h-full bg-brand-blue rounded-full transition-all duration-500 shadow-md shadow-brand-blue/15"
                        style={{ width: `${Math.min(Math.round(((userData?.totalPoints || 0) / userData.activeGoal.pointsRequired) * 100), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Redeem Button / Focus Box */}
                  <div className="mt-2 shrink-0">
                    {(userData?.totalPoints || 0) >= userData.activeGoal.pointsRequired ? (
                      <button
                        type="button"
                        onClick={handleRedeemPrize}
                        disabled={redeeming}
                        className="w-full py-2.5 sm:py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl border-2 border-white transition-all active:scale-[0.98]"
                      >
                        {redeeming ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Award className="w-4 h-4" />
                            <span>{t.redeemPrizeNow}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="bg-amber-500/10 border-2 border-amber-400/40 rounded-xl p-2 sm:p-3 text-center">
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-0.5">
                          {t.goalFocus}
                        </span>
                        <p className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-snug">
                          {t.goalFocusText.split('{points}')[0]}
                          <span className="text-sm font-black text-brand-blue px-1">
                            {(userData.activeGoal.pointsRequired - (userData?.totalPoints || 0)).toLocaleString()}
                          </span>
                          {t.goalFocusText.split('{points}')[1]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-1">
                  <p className="text-xs font-bold">{t.noActiveGoal}</p>
                  <p className="text-[9px] text-slate-400 text-center">{t.noActiveGoalSub}</p>
                </div>
              )}
            </div>

            {/* BOTTOM BOX - 30% (flex-[3]) */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex-[2.5] w-full bg-brand-blue hover:bg-brand-blue/95 active:scale-[0.97] text-white rounded-3xl p-4 shadow-xl shadow-brand-blue/20 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer border-4 border-white"
            >
              <div className="bg-white/20 p-2 sm:p-3 rounded-full">
                <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[3.5]" />
              </div>
              <span className="text-lg sm:text-xl font-black tracking-wide uppercase text-white">
                {t.uploadNewBill}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-brand-blue-50/80 bg-brand-dark/20 px-3 py-1 rounded-full uppercase tracking-wider">
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
              <div className="flex flex-col gap-2.5">
                {goals.map((g) => {
                  const isSelectedGoal = userData?.activeGoal && userData.activeGoal.name === g.name;
                  return (
                    <div 
                      key={g.id || g.name} 
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200 flex p-2.5 gap-3 items-center shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Left Side: Thumbnail */}
                      <div className="w-20 h-20 bg-slate-50 border border-slate-150 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                        {g.imageUrl ? (
                          <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      {/* Right Side: Details & Set Goal button */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-800 text-xs leading-snug line-clamp-2">{g.name}</h4>
                          <span className="inline-block bg-brand-blue/10 text-brand-blue text-[9px] font-black px-2 py-0.5 rounded-full border border-brand-blue/20 uppercase tracking-wider">
                            {g.pointsRequired.toLocaleString()} {t.pts}
                          </span>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSelectGoal(g)}
                            disabled={isSelectedGoal}
                            className={`py-1.5 px-3.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isSelectedGoal
                                ? 'bg-brand-blue text-white shadow-sm shadow-brand-blue/10 pointer-events-none'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
                            }`}
                          >
                            {isSelectedGoal ? t.currentGoal : t.setAsGoal}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="space-y-4 pb-20">
            <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-brand-blue" />
              <span>{language === 'en' ? 'Announcements & Updates' : 'घोषणाएँ और अपडेट'}</span>
            </h3>

            {loadingAnnouncements ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-sm font-semibold">
                {language === 'en' ? 'Loading updates...' : 'अपडेट लोड हो रहे हैं...'}
              </div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 text-xs font-semibold">
                {language === 'en' ? 'No updates published yet.' : 'अभी तक कोई अपडेट प्रकाशित नहीं हुआ है।'}
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {ann.imageUrl && (
                      <div className="w-full h-48 bg-slate-50 border-b border-slate-100 overflow-hidden">
                        <img src={ann.imageUrl} alt={ann.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-slate-800 text-sm">{ann.title}</h4>
                        <span className="text-[9px] text-slate-400 font-bold shrink-0 whitespace-nowrap">
                          {formatDate(ann.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </p>
                    </div>
                  </div>
                ))}
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
                          {claim.place && (
                            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                              📍 {claim.place}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-250 py-2.5 px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-25 flex justify-around max-w-md mx-auto rounded-t-3xl">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'dashboard' ? 'text-brand-blue font-black scale-105' : 'text-slate-400 hover:text-slate-500 font-bold'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.tabDashboard}</span>
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'rewards' ? 'text-brand-blue font-black scale-105' : 'text-slate-400 hover:text-slate-500 font-bold'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.tabRewards}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('updates')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
            activeTab === 'updates' ? 'text-brand-blue font-black scale-105' : 'text-slate-400 hover:text-slate-500 font-bold'
          }`}
        >
          <Megaphone className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider font-extrabold">{t.tabUpdates}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer active:scale-95 ${
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
                  {/* Speech to Text Hindi Voice Quick Fill */}
                  <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Mic className="w-5 h-5 text-brand-blue" />
                        <span className="font-extrabold text-xs text-brand-blue uppercase tracking-wider">
                          {language === 'en' ? 'Hindi Voice Quick-Fill' : 'हिंदी आवाज़ से भरें'}
                        </span>
                      </div>
                      
                      {isListening && (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                          <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-wider animate-pulse">
                            {language === 'en' ? 'Listening...' : 'सुन रहे हैं...'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                      {language === 'en' 
                        ? 'Tap the mic and describe the bill details in Hindi (e.g. "280 ft mal lia hai kashipur ka party, 20 tarik ko")' 
                        : 'माइक दबाकर बिल की जानकारी हिंदी में बोलें (उदा. "280 फीट माल लिया है काशीपुर का पार्टी, 20 तारीख को")'}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={startSpeechRecognition}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                          isListening 
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/10' 
                            : 'bg-brand-blue hover:bg-brand-blue/95 text-white shadow-md shadow-brand-blue/10'
                        }`}
                      >
                        <Mic className="w-4 h-4 shrink-0" />
                        <span>
                          {isListening 
                            ? (language === 'en' ? 'Stop Listening' : 'सुनना बंद करें') 
                            : (language === 'en' ? 'Start Speaking' : 'बोलना शुरू करें')}
                        </span>
                      </button>
                    </div>

                    {listeningError && (
                      <span className="text-[9px] text-red-500 font-bold block text-center">
                        ⚠️ {listeningError}
                      </span>
                    )}

                    {voiceTranscript && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                          {language === 'en' ? 'Transcribed Text' : 'सुना गया पाठ'}
                        </span>
                        <p className="text-[11px] text-slate-700 font-semibold leading-normal italic">
                          "{voiceTranscript}"
                        </p>
                      </div>
                    )}
                  </div>

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
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 text-xl font-black focus:outline-none transition-all placeholder:text-slate-350"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Place / Location - Optional */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                      {t.placeOpt}
                    </label>
                    <input
                      type="text"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 font-bold focus:outline-none transition-all placeholder:text-slate-355"
                      placeholder={t.placePlaceholder}
                    />
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

      {/* Toast Notifications Overlay */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-55 space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto bg-slate-900/90 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-md flex gap-3 animate-fade-in transition-all duration-300 transform translate-y-0"
          >
            <div className="bg-brand-blue/20 p-2 rounded-xl h-10 w-10 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-brand-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-extrabold text-sm block leading-snug truncate">{t.title}</span>
              <p className="text-xs text-slate-300 font-semibold mt-1 leading-normal">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
              className="text-slate-400 hover:text-white shrink-0 cursor-pointer self-start"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
