import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Check, X, ShieldAlert, Award, FileText, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, Plus, Gift, Truck, Users, Edit } from 'lucide-react';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminDashboard() {
  const { user, userData, logout, isMock, updateContractorPoints, updateContractorTransaction } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('approvals');

  // Pending claims and stats
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal for looking at bill image closely
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [actioningClaimId, setActioningClaimId] = useState(null);
  
  // State for running feet adjustments during approval review
  const [editRunningFeet, setEditRunningFeet] = useState('');
  const [adjustedRfts, setAdjustedRfts] = useState({});

  const handleOpenInspector = (claim) => {
    setSelectedClaim(claim);
    const claimId = claim.id || claim.timestamp;
    const currentRft = adjustedRfts[claimId] !== undefined ? adjustedRfts[claimId] : (claim.runningFeet?.toString() || '');
    setEditRunningFeet(currentRft);
  };

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalPointsGiven: 0,
    pendingRedemptions: 0
  });

  // Phase 3 States
  const [redemptions, setRedemptions] = useState([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [actioningRedemptionId, setActioningRedemptionId] = useState(null);

  // Delivery proof states
  const [deliveringRedemption, setDeliveringRedemption] = useState(null);
  const [deliveryImagePreview, setDeliveryImagePreview] = useState(null);
  const [submittingDelivery, setSubmittingDelivery] = useState(false);

  // Goal Creator Form States
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalPoints, setNewGoalPoints] = useState('');
  const [goalImagePreview, setGoalImagePreview] = useState(null);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [goalCreateSuccess, setGoalCreateSuccess] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingGoalOldName, setEditingGoalOldName] = useState('');
  const [formMessage, setFormMessage] = useState('');

  // Goals Catalog states
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);

  // Contractor Goal progress states
  const [contractors, setContractors] = useState([]);
  const [loadingContractors, setLoadingContractors] = useState(true);
  const [expandedContractorId, setExpandedContractorId] = useState(null);
  const [selectedContractorForModal, setSelectedContractorForModal] = useState(null);
  const [zoomedPhoto, setZoomedPhoto] = useState(null);

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
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const getTimestampMs = (ts) => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (ts.seconds) return ts.seconds * 1000;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    return new Date(ts).getTime() || 0;
  };

  const getContractorTimeline = (contractorUid) => {
    const contractorClaims = claims
      .filter(c => c.contractorId === contractorUid)
      .map(c => ({
        type: 'claim',
        timestamp: getTimestampMs(c.timestamp),
        title: `Submitted Bill: ${c.billNumber}`,
        description: `Amount: ₹${c.amount.toLocaleString()} | Running Feet: ${c.runningFeet} RFT | Status: ${c.status.toUpperCase()}`,
        points: c.status === 'approved' ? `+${c.points} Pts` : c.status === 'pending' ? `+${c.points} Pts (Pending)` : '0 Pts (Rejected)',
        imageUrl: c.imageUrl,
        status: c.status,
      }));

    const contractorRedemptions = redemptions
      .filter(r => r.contractorId === contractorUid)
      .map(r => ({
        type: 'redemption',
        timestamp: getTimestampMs(r.timestamp),
        title: `Redeemed Reward: ${r.goalName}`,
        description: `Points Spent: ${r.pointsSpent.toLocaleString()} Pts | Status: ${r.status.toUpperCase()}`,
        points: `-${r.pointsSpent} Pts`,
        imageUrl: r.deliveryImageUrl || '',
        status: r.status,
      }));

    return [...contractorClaims, ...contractorRedemptions].sort((a, b) => b.timestamp - a.timestamp);
  };

  const loadClaims = async () => {
    setLoading(true);
    setError('');

    if (isMock) {
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const mockClaimsList = savedClaims ? JSON.parse(savedClaims) : [];
      
      // Calculate Stats
      const pendingCount = mockClaimsList.filter(c => c.status === 'pending').length;
      const approvedCount = mockClaimsList.filter(c => c.status === 'approved').length;
      const rejectedCount = mockClaimsList.filter(c => c.status === 'rejected').length;
      const totalPoints = mockClaimsList
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + c.points, 0);

      setStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalPointsGiven: totalPoints
      });

      // Filter and show pending in dashboard queue, or all.
      // Let's sort pending first, then by timestamp desc.
      const sorted = [...mockClaimsList].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return b.timestamp - a.timestamp;
      });

      setClaims(sorted);
      setLoading(false);
      return;
    }

    try {
      const claimsRef = collection(db, 'claims');
      const querySnapshot = await getDocs(claimsRef);
      const claimsList = [];
      
      querySnapshot.forEach((docSnap) => {
        claimsList.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Calculate Stats
      const pendingCount = claimsList.filter(c => c.status === 'pending').length;
      const approvedCount = claimsList.filter(c => c.status === 'approved').length;
      const rejectedCount = claimsList.filter(c => c.status === 'rejected').length;
      const totalPoints = claimsList
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + c.points, 0);

      setStats({
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalPointsGiven: totalPoints
      });

      // Sort pending first, then desc timestamp
      claimsList.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        const t1 = a.timestamp?.seconds || a.timestamp || 0;
        const t2 = b.timestamp?.seconds || b.timestamp || 0;
        return t2 - t1;
      });

      setClaims(claimsList);
    } catch (err) {
      console.error("Error loading claims in admin view:", err);
      setError("Failed to fetch claims database. Firestore permissions might need checking.");
      
      // Fallback to local
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const mockClaimsList = savedClaims ? JSON.parse(savedClaims) : [];
      setClaims(mockClaimsList);
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptions = async () => {
    setLoadingRedemptions(true);
    if (isMock) {
      const saved = localStorage.getItem('nilkamal_mock_redemptions');
      const mockRedemptions = saved ? JSON.parse(saved) : [];
      mockRedemptions.sort((a, b) => b.timestamp - a.timestamp);
      setRedemptions(mockRedemptions);
      setStats(prev => ({ 
        ...prev, 
        pendingRedemptions: mockRedemptions.filter(r => r.status === 'requested').length 
      }));
      setLoadingRedemptions(false);
      return;
    }

    try {
      const redemptionsRef = collection(db, 'redemptions');
      const querySnapshot = await getDocs(redemptionsRef);
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
      setStats(prev => ({ 
        ...prev, 
        pendingRedemptions: redemptionsList.filter(r => r.status === 'requested').length 
      }));
    } catch (err) {
      console.error("Error loading redemptions:", err);
      // Fallback
      const saved = localStorage.getItem('nilkamal_mock_redemptions');
      const mockRedemptions = saved ? JSON.parse(saved) : [];
      setRedemptions(mockRedemptions);
      setStats(prev => ({ 
        ...prev, 
        pendingRedemptions: mockRedemptions.filter(r => r.status === 'requested').length 
      }));
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleMarkDelivered = (redemption) => {
    setDeliveringRedemption(redemption);
    setDeliveryImagePreview(null);
  };

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    if (!deliveringRedemption) return;

    setSubmittingDelivery(true);
    const redemptionId = deliveringRedemption.id;
    const deliveryImageUrl = deliveryImagePreview || '';

    if (isMock) {
      setTimeout(async () => {
        const saved = localStorage.getItem('nilkamal_mock_redemptions');
        const allRedemptions = saved ? JSON.parse(saved) : [];
        const updated = allRedemptions.map(r => {
          if (r.id === redemptionId) {
            return { 
              ...r, 
              status: 'delivered',
              deliveryImageUrl: deliveryImageUrl
            };
          }
          return r;
        });
        localStorage.setItem('nilkamal_mock_redemptions', JSON.stringify(updated));
        
        // Update Ramesh's profile in local contractors list to clear goal
        const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
        if (savedContractors) {
          const list = JSON.parse(savedContractors);
          const updatedList = list.map(c => {
            if (c.uid === deliveringRedemption.contractorId) {
              return { ...c, activeGoal: null };
            }
            return c;
          });
          localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(updatedList));
        }

        // Update contractor transaction
        await updateContractorTransaction(deliveringRedemption.contractorId, `Delivered reward: ${deliveringRedemption.goalName}`);

        setSubmittingDelivery(false);
        setDeliveringRedemption(null);
        setDeliveryImagePreview(null);
        loadRedemptions();
        loadContractors();
      }, 800);
      return;
    }

    try {
      const redemptionRef = doc(db, 'redemptions', redemptionId);
      await updateDoc(redemptionRef, { 
        status: 'delivered',
        deliveryImageUrl: deliveryImageUrl
      });

      // Update contractor transaction
      await updateContractorTransaction(deliveringRedemption.contractorId, `Delivered reward: ${deliveringRedemption.goalName}`);

      setSubmittingDelivery(false);
      setDeliveringRedemption(null);
      setDeliveryImagePreview(null);
      loadRedemptions();
      loadContractors();
    } catch (err) {
      console.error("Error marking redemption as delivered:", err);
      alert("Error updating redemption status.");
      setSubmittingDelivery(false);
    }
  };

  const handleGoalImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGoalImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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

  const loadContractors = async () => {
    setLoadingContractors(true);
    if (isMock) {
      const saved = localStorage.getItem('nilkamal_mock_contractors_list');
      let list = saved ? JSON.parse(saved) : [];
      if (list.length === 0) {
        list = [
          {
            uid: 'mock-contractor-uid',
            name: 'Ramesh Kumar (Contractor)',
            role: 'contractor',
            mobileNumber: '9876543210',
            photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60',
            lastLoginTime: Date.now() - 3600000,
            lastTransaction: { description: 'Registered account', timestamp: Date.now() - 86400000 },
            totalPoints: parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10),
            activeGoal: localStorage.getItem('nilkamal_mock_active_goal') ? JSON.parse(localStorage.getItem('nilkamal_mock_active_goal')) : null
          }
        ];
        localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(list));
      } else {
        list = list.map(c => {
          if (c.uid === 'mock-contractor-uid') {
            return {
              ...c,
              mobileNumber: c.mobileNumber || '9876543210',
              photo: c.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60',
              lastLoginTime: c.lastLoginTime || (Date.now() - 3600000),
              lastTransaction: c.lastTransaction || { description: 'Registered account', timestamp: Date.now() - 86400000 },
              totalPoints: parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10),
              activeGoal: localStorage.getItem('nilkamal_mock_active_goal') ? JSON.parse(localStorage.getItem('nilkamal_mock_active_goal')) : null
            };
          }
          return c;
        });
        localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(list));
      }
      setContractors(list);
      setLoadingContractors(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'contractor'));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ uid: docSnap.id, ...docSnap.data() });
      });
      setContractors(list);
    } catch (err) {
      console.error("Error loading contractors:", err);
      const saved = localStorage.getItem('nilkamal_mock_contractors_list');
      setContractors(saved ? JSON.parse(saved) : []);
    } finally {
      setLoadingContractors(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoalName || !newGoalPoints) return;
    
    setCreatingGoal(true);
    const pointsVal = parseInt(newGoalPoints, 10);
    const imageVal = goalImagePreview || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&auto=format&fit=crop&q=60';

    if (isMock) {
      const goalData = {
        id: 'mock-goal-' + Date.now(),
        name: newGoalName,
        pointsRequired: pointsVal,
        imageUrl: imageVal
      };
      
      const saved = localStorage.getItem('nilkamal_mock_goals');
      const allGoals = saved ? JSON.parse(saved) : [];
      allGoals.push(goalData);
      localStorage.setItem('nilkamal_mock_goals', JSON.stringify(allGoals));
      
      setTimeout(() => {
        setCreatingGoal(false);
        setNewGoalName('');
        setNewGoalPoints('');
        setGoalImagePreview(null);
        setGoalCreateSuccess(true);
        setFormMessage('Goal created successfully!');
        loadGoals();
        setTimeout(() => {
          setGoalCreateSuccess(false);
          setFormMessage('');
        }, 3000);
      }, 500);
      return;
    }

    try {
      const goalsRef = collection(db, 'goals');
      await addDoc(goalsRef, {
        name: newGoalName,
        pointsRequired: pointsVal,
        imageUrl: imageVal
      });
      setCreatingGoal(false);
      setNewGoalName('');
      setNewGoalPoints('');
      setGoalImagePreview(null);
      setGoalCreateSuccess(true);
      setFormMessage('Goal created successfully!');
      loadGoals();
      setTimeout(() => {
        setGoalCreateSuccess(false);
        setFormMessage('');
      }, 3000);
    } catch (err) {
      console.error("Error creating goal in Firestore:", err);
      alert("Error adding reward to Firestore.");
      setCreatingGoal(false);
    }
  };

  const handleStartEdit = (goal) => {
    setEditingGoalId(goal.id || goal.name);
    setEditingGoalOldName(goal.name);
    setNewGoalName(goal.name);
    setNewGoalPoints(goal.pointsRequired.toString());
    setGoalImagePreview(goal.imageUrl || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingGoalId(null);
    setEditingGoalOldName('');
    setNewGoalName('');
    setNewGoalPoints('');
    setGoalImagePreview(null);
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    if (!editingGoalId || !newGoalName || !newGoalPoints) return;

    setCreatingGoal(true);
    const pointsVal = parseInt(newGoalPoints, 10);
    const imageVal = goalImagePreview || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&auto=format&fit=crop&q=60';
    const oldGoalName = editingGoalOldName;

    if (isMock) {
      // 1. Update in nilkamal_mock_goals
      const saved = localStorage.getItem('nilkamal_mock_goals');
      const allGoals = saved ? JSON.parse(saved) : [];
      const updated = allGoals.map(g => {
        if (g.id === editingGoalId) {
          return {
            ...g,
            name: newGoalName,
            pointsRequired: pointsVal,
            imageUrl: imageVal
          };
        }
        return g;
      });
      localStorage.setItem('nilkamal_mock_goals', JSON.stringify(updated));

      // 2. Update contractor active goal in localStorage list
      const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
      if (savedContractors) {
        const list = JSON.parse(savedContractors);
        const updatedList = list.map(c => {
          if (c.activeGoal && (c.activeGoal.id === editingGoalId || c.activeGoal.name === oldGoalName)) {
            return {
              ...c,
              activeGoal: {
                ...c.activeGoal,
                name: newGoalName,
                pointsRequired: pointsVal,
                imageUrl: imageVal
              }
            };
          }
          return c;
        });
        localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(updatedList));
      }

      // 3. Update current logged-in mock contractor's active goal if matches
      const savedActiveGoal = localStorage.getItem('nilkamal_mock_active_goal');
      if (savedActiveGoal) {
        const activeGoalObj = JSON.parse(savedActiveGoal);
        if (activeGoalObj.id === editingGoalId || activeGoalObj.name === oldGoalName) {
          const updatedActiveGoal = {
            ...activeGoalObj,
            name: newGoalName,
            pointsRequired: pointsVal,
            imageUrl: imageVal
          };
          localStorage.setItem('nilkamal_mock_active_goal', JSON.stringify(updatedActiveGoal));
        }
      }

      setTimeout(() => {
        setCreatingGoal(false);
        setEditingGoalId(null);
        setEditingGoalOldName('');
        setNewGoalName('');
        setNewGoalPoints('');
        setGoalImagePreview(null);
        setGoalCreateSuccess(true);
        setFormMessage('Goal updated successfully!');
        loadGoals();
        loadContractors();
        setTimeout(() => {
          setGoalCreateSuccess(false);
          setFormMessage('');
        }, 3000);
      }, 500);
      return;
    }

    try {
      // 1. Update goal doc in Firestore
      const goalRef = doc(db, 'goals', editingGoalId);
      await updateDoc(goalRef, {
        name: newGoalName,
        pointsRequired: pointsVal,
        imageUrl: imageVal
      });

      // 2. Update all contractors holding this goal in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'contractor'));
      const querySnapshot = await getDocs(q);
      
      const updatePromises = [];
      querySnapshot.forEach((userDoc) => {
        const uData = userDoc.data();
        if (uData.activeGoal && (uData.activeGoal.id === editingGoalId || uData.activeGoal.name === oldGoalName)) {
          const contractorRef = doc(db, 'users', userDoc.id);
          updatePromises.push(
            updateDoc(contractorRef, {
              activeGoal: {
                ...uData.activeGoal,
                name: newGoalName,
                pointsRequired: pointsVal,
                imageUrl: imageVal
              }
            })
          );
        }
      });
      await Promise.all(updatePromises);

      setCreatingGoal(false);
      setEditingGoalId(null);
      setEditingGoalOldName('');
      setNewGoalName('');
      setNewGoalPoints('');
      setGoalImagePreview(null);
      setGoalCreateSuccess(true);
      setFormMessage('Goal updated successfully!');
      loadGoals();
      loadContractors();
      setTimeout(() => {
        setGoalCreateSuccess(false);
        setFormMessage('');
      }, 3000);
    } catch (err) {
      console.error("Error updating goal in Firestore:", err);
      alert("Error updating reward in database.");
      setCreatingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Are you sure you want to delete this reward goal?")) return;

    if (editingGoalId === goalId) {
      handleCancelEdit();
    }

    if (isMock) {
      const saved = localStorage.getItem('nilkamal_mock_goals');
      const allGoals = saved ? JSON.parse(saved) : [];
      const updated = allGoals.filter(g => g.id !== goalId);
      localStorage.setItem('nilkamal_mock_goals', JSON.stringify(updated));
      loadGoals();
      return;
    }

    try {
      await deleteDoc(doc(db, 'goals', goalId));
      loadGoals();
    } catch (err) {
      console.error("Error deleting goal:", err);
      alert("Failed to delete goal.");
    }
  };

  useEffect(() => {
    loadClaims();
    loadRedemptions();
    loadContractors();
    loadGoals();
  }, [isMock]);

  // Handle Approve
  const handleApprove = async (claim, overrideRft) => {
    const claimId = claim.id || claim.timestamp;
    setActioningClaimId(claimId);
    
    // Parse final RFT and calculate points (1 RFT = 1 Point)
    const finalRft = parseFloat(overrideRft !== undefined && overrideRft !== '' ? overrideRft : claim.runningFeet) || 0;
    const finalPoints = Math.round(finalRft);

    if (isMock) {
      // 1. Update status, RFT, and points in localStorage claims list
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const allClaims = savedClaims ? JSON.parse(savedClaims) : [];
      const updatedClaims = allClaims.map(c => {
        if (c.contractorId === claim.contractorId && c.timestamp === claim.timestamp) {
          return { 
            ...c, 
            status: 'approved',
            runningFeet: finalRft,
            points: finalPoints
          };
        }
        return c;
      });
      localStorage.setItem('nilkamal_mock_claims', JSON.stringify(updatedClaims));

      // 2. Add points to contractor
      await updateContractorPoints(claim.contractorId, finalPoints);

      // Update contractor transaction
      await updateContractorTransaction(claim.contractorId, `Approved Bill ${claim.billNumber} (+${finalPoints} Pts)`);

      // Simulate network delay
      setTimeout(() => {
        setActioningClaimId(null);
        setSelectedClaim(null);
        loadClaims();
        loadContractors();
      }, 500);
      return;
    }

    try {
      // 1. Update the claim status, RFT, and points in Firestore
      const claimRef = doc(db, 'claims', claim.id);
      await updateDoc(claimRef, { 
        status: 'approved',
        runningFeet: finalRft,
        points: finalPoints
      });

      // 2. Add points to contractor user document
      await updateContractorPoints(claim.contractorId, finalPoints);

      // Update contractor transaction
      await updateContractorTransaction(claim.contractorId, `Approved Bill ${claim.billNumber} (+${finalPoints} Pts)`);

      setActioningClaimId(null);
      setSelectedClaim(null);
      loadClaims();
      loadContractors();
    } catch (err) {
      console.error("Error approving claim:", err);
      alert("Error updating database. Operation failed.");
      setActioningClaimId(null);
    }
  };

  // Handle Reject
  const handleReject = async (claim) => {
    setActioningClaimId(claim.id || claim.timestamp);

    if (isMock) {
      const savedClaims = localStorage.getItem('nilkamal_mock_claims');
      const allClaims = savedClaims ? JSON.parse(savedClaims) : [];
      const updatedClaims = allClaims.map(c => {
        if (c.contractorId === claim.contractorId && c.timestamp === claim.timestamp) {
          return { ...c, status: 'rejected' };
        }
        return c;
      });
      localStorage.setItem('nilkamal_mock_claims', JSON.stringify(updatedClaims));

      // Update contractor transaction
      await updateContractorTransaction(claim.contractorId, `Rejected Bill ${claim.billNumber}`);

      setTimeout(() => {
        setActioningClaimId(null);
        setSelectedClaim(null);
        loadClaims();
      }, 500);
      return;
    }

    try {
      const claimRef = doc(db, 'claims', claim.id);
      await updateDoc(claimRef, { status: 'rejected' });
      
      // Update contractor transaction
      await updateContractorTransaction(claim.contractorId, `Rejected Bill ${claim.billNumber}`);

      setActioningClaimId(null);
      setSelectedClaim(null);
      loadClaims();
    } catch (err) {
      console.error("Error rejecting claim:", err);
      alert("Error updating database. Operation failed.");
      setActioningClaimId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Header */}
      <header className="bg-brand-dark text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-brand-blue font-extrabold text-lg uppercase tracking-wider">Nilkamal</span>
          <span className="bg-brand-blue/20 text-brand-blue text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase">
            Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { loadClaims(); loadRedemptions(); }}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg active:scale-95 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={logout}
            className="p-1.5 bg-red-950 text-red-400 rounded-lg border border-red-900 active:scale-95 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Admin Dashboard View */}
      <main className="max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Reviews</span>
            <span className="text-2xl font-black text-amber-500">{stats.pending}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pending Rewards</span>
            <span className="text-2xl font-black text-rose-500">{stats.pendingRedemptions || 0}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Approved Bills</span>
            <span className="text-2xl font-black text-green-600">{stats.approved}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rejected Bills</span>
            <span className="text-2xl font-black text-red-500">{stats.rejected}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1 lg:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <span>Points Issued</span>
            </span>
            <span className="text-2xl font-black text-brand-dark">{stats.totalPointsGiven.toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2 pb-px bg-white p-2 rounded-2xl shadow-sm mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 font-bold'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bill Approvals ({stats.pending})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('redemptions')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'redemptions'
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 font-bold'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Reward Delivery ({stats.pendingRedemptions || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contractors')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'contractors'
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 font-bold'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contractors</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10 font-bold'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Manage Catalog</span>
          </button>
        </div>

        {activeTab === 'approvals' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-blue" />
              <span>Pending Approvals</span>
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {stats.pending} waiting review
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm font-semibold">
              Loading claims data...
            </div>
          ) : claims.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-bold text-base">All clear!</p>
              <p className="text-xs text-slate-400">No contractor bills are awaiting approval.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {claims.map((claim, idx) => {
                const claimId = claim.id || claim.timestamp;
                const isPending = claim.status === 'pending';
                const isClaimActioning = actioningClaimId === claimId;

                return (
                  <div 
                    key={claimId}
                    className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      isPending ? 'bg-amber-50/10 hover:bg-slate-50' : 'bg-white opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Contractor & Bill Info */}
                    <div className="flex gap-4 items-start">
                      {/* Image Thumbnail */}
                      <button
                        type="button"
                        onClick={() => handleOpenInspector(claim)}
                        className="w-16 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 hover:border-brand-blue transition-all cursor-zoom-in relative group"
                      >
                        {claim.imageUrl ? (
                          <>
                            <img src={claim.imageUrl} alt="Bill" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-[9px] font-bold">
                              ZOOM
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center leading-none">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[8px] font-bold uppercase mt-1">NO PIC</span>
                          </div>
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-base">{claim.contractorName}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">({claim.billNumber})</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500">
                          <span>Amount: <b className="text-slate-800">₹{claim.amount.toLocaleString()}</b></span>
                          {isPending ? (
                            <div className="flex items-center gap-1.5">
                              <span>RFT:</span>
                              <input
                                type="number"
                                value={adjustedRfts[claimId] !== undefined ? adjustedRfts[claimId] : (claim.runningFeet || 0)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAdjustedRfts(prev => ({ ...prev, [claimId]: val }));
                                }}
                                className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-200 focus:border-brand-blue focus:bg-white rounded text-slate-900 font-extrabold text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue text-center"
                              />
                            </div>
                          ) : (
                            <span>RFT: <b className="text-slate-800">{claim.runningFeet || 0}</b></span>
                          )}
                          <span>
                            Points: <b className="text-brand-blue">
                              +{isPending 
                                ? Math.round(parseFloat(adjustedRfts[claimId] !== undefined ? adjustedRfts[claimId] : claim.runningFeet) || 0) 
                                : claim.points
                              }
                            </b>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Submitted: {formatDateTime(claim.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons or Status Badge */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {!isPending ? (
                        <div className="flex items-center">
                          {claim.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-full">
                              <CheckCircle className="w-4 h-4" /> Approved
                            </span>
                          )}
                          {claim.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-red-700 bg-red-100 border border-red-200 px-3 py-1 rounded-full">
                              <AlertCircle className="w-4 h-4" /> Rejected
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReject(claim)}
                            disabled={isClaimActioning}
                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApprove(claim, adjustedRfts[claimId])}
                            disabled={isClaimActioning}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-green-600/10 hover:shadow-green-600/20 disabled:opacity-50"
                          >
                            {isClaimActioning ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Approve</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'redemptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
              <Gift className="w-5 h-5 text-brand-blue" />
              <span>Rewards Fulfillment Queue</span>
            </h3>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-200">
              {stats.pendingRedemptions || 0} requested
            </span>
          </div>

          {loadingRedemptions ? (
            <div className="p-12 text-center text-slate-400 text-sm font-semibold">
              Loading redemption requests...
            </div>
          ) : redemptions.filter(r => r.status === 'requested').length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-bold text-base">All clear!</p>
              <p className="text-xs text-slate-400">No pending reward redemptions.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {redemptions.filter(r => r.status === 'requested').map((r) => {
                const redemptionId = r.id;
                const isActioning = actioningRedemptionId === redemptionId;

                return (
                  <div 
                    key={redemptionId}
                    className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-base">{r.contractorName}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Contractor
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Requested: <b className="text-slate-800">{r.goalName}</b>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Points Spent: <b className="text-brand-blue">{r.pointsSpent.toLocaleString()} Pts</b>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Requested on: {formatDateTime(r.timestamp)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleMarkDelivered(r)}
                        disabled={submittingDelivery && deliveringRedemption?.id === redemptionId}
                        className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-brand-blue/10 hover:shadow-brand-blue/20 disabled:opacity-50 border-2 border-white"
                      >
                        {submittingDelivery && deliveringRedemption?.id === redemptionId ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Truck className="w-4 h-4" />
                            <span>Mark Delivered</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'contractors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-blue" />
              <span>Contractor Goals Tracking</span>
            </h3>
            <span className="bg-brand-blue/10 text-brand-blue text-xs font-bold px-2 py-0.5 rounded-full border border-brand-blue/20">
              {contractors.length} Contractors
            </span>
          </div>

          {loadingContractors ? (
            <div className="p-12 text-center text-slate-400 text-sm font-semibold">
              Loading contractor tracking data...
            </div>
          ) : contractors.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-bold text-base">No contractors found.</p>
              <p className="text-xs text-slate-400 mt-1">Register contractors to track their active goals.</p>
            </div>
          ) : (
            <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {contractors.map((c) => {
                const activeGoal = c.activeGoal;
                const points = c.totalPoints || 0;
                const progressPercent = activeGoal 
                  ? Math.min(Math.round((points / activeGoal.pointsRequired) * 100), 100) 
                  : 0;

                return (
                  <div 
                    key={c.uid}
                    onClick={() => setExpandedContractorId(expandedContractorId === c.uid ? null : c.uid)}
                    className="bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-4 border border-slate-150 flex flex-col gap-3 shadow-sm transition-all cursor-pointer"
                  >
                    {/* Contractor Identity */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 border-brand-blue bg-slate-200 flex items-center justify-center shrink-0 ${c.photo ? 'cursor-zoom-in hover:brightness-95' : ''}`}
                          onClick={(e) => {
                            if (c.photo) {
                              e.stopPropagation();
                              setZoomedPhoto({ url: c.photo, title: c.name });
                            }
                          }}
                        >
                          {c.photo ? (
                            <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">{c.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Balance: <span className="text-slate-800 font-extrabold">{points.toLocaleString()} Pts</span>
                          </p>
                          <p className="text-[10px] font-bold text-brand-blue mt-0.5 flex items-center gap-1">
                            <span className="shrink-0">🎯 Goal:</span>
                            <span className="font-extrabold truncate max-w-[120px] sm:max-w-[180px]" title={activeGoal?.name || 'None'}>
                              {activeGoal ? activeGoal.name : 'None'}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {activeGoal && (
                          <span className="text-[9px] font-black bg-brand-blue-50 text-brand-blue border border-brand-blue-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            🎯 {progressPercent}%
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-bold">
                          {expandedContractorId === c.uid ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Inline Expanded Area */}
                    {expandedContractorId === c.uid && (
                      <div className="pt-3 border-t border-slate-200/60 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-150">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Mobile Number</span>
                            <span className="font-extrabold text-slate-700">{c.mobileNumber || 'N/A'}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-150">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Last Login Time</span>
                            <span className="font-extrabold text-slate-700">
                              {c.lastLoginTime ? formatDateTime(c.lastLoginTime) : 'N/A'}
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-150 sm:col-span-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">Last Transaction</span>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <span className="font-extrabold text-slate-800 font-mono text-[11px] leading-tight">
                                {c.lastTransaction?.description || 'No transactions recorded yet.'}
                              </span>
                              {c.lastTransaction?.timestamp && (
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {formatDateTime(c.lastTransaction.timestamp)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Active Goal Progress Info */}
                        {activeGoal ? (
                          <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex gap-2.5 items-center">
                              <div className="w-10 h-10 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {activeGoal.imageUrl ? (
                                  <img src={activeGoal.imageUrl} alt={activeGoal.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-extrabold text-slate-800 text-xs truncate leading-tight">
                                  {activeGoal.name}
                                </h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                  Target: {activeGoal.pointsRequired.toLocaleString()} Pts
                                </p>
                              </div>
                            </div>

                            {/* Progress Bar & Percentage */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold text-slate-500">
                                <span>{progressPercent}% COMPLETE</span>
                                <span>{points.toLocaleString()} / {activeGoal.pointsRequired.toLocaleString()} Pts</span>
                              </div>
                              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    progressPercent >= 100 ? 'bg-green-500' : 'bg-brand-blue'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center py-5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              No active goal set
                            </span>
                          </div>
                        )}

                        {/* View Full Profile & Timeline Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedContractorForModal(c)}
                          className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue/95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm border border-brand-blue active:scale-95"
                        >
                          View Full Profile & Timeline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create/Edit Goal Form (Left Panel) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-100 p-4 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
                {editingGoalId ? (
                  <>
                    <Edit className="w-5 h-5 text-brand-blue" />
                    <span>Edit Reward Goal</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-brand-blue" />
                    <span>Create a New Goal</span>
                  </>
                )}
              </h3>
            </div>

            <form onSubmit={editingGoalId ? handleUpdateGoal : handleCreateGoal} className="p-5 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {formMessage && (
                  <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-700 text-sm flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{formMessage}</span>
                  </div>
                )}

                {/* Goal Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5 pl-0.5">
                    Reward Name *
                  </label>
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 font-semibold focus:outline-none transition-all"
                    placeholder="e.g. Premium Leather Toolkit"
                    required
                  />
                </div>

                {/* Points Required */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5 pl-0.5">
                    Points Required *
                  </label>
                  <input
                    type="number"
                    value={newGoalPoints}
                    onChange={(e) => setNewGoalPoints(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-brand-blue focus:bg-white rounded-xl text-slate-900 font-semibold focus:outline-none transition-all"
                    placeholder="e.g. 1500"
                    min="1"
                    required
                  />
                </div>

                {/* Image Upload Input */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5 pl-0.5">
                    Reward Image {editingGoalId ? '(Optional)' : '*'}
                  </label>
                  <div className="relative">
                    {goalImagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-28 flex justify-center bg-slate-900">
                        <img src={goalImagePreview} alt="Goal Preview" className="h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setGoalImagePreview(null)}
                          className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow-md cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full h-28 border-2 border-dashed border-slate-300 hover:border-brand-blue rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all bg-slate-50 hover:bg-brand-blue/5 text-center px-4">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wide">
                          Upload Reward Image
                        </span>
                        <span className="text-[9px] text-slate-400">JPEG, PNG file</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleGoalImageChange}
                          className="hidden"
                          required={!editingGoalId}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 w-full">
                {editingGoalId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                  >
                    <span>Cancel</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={creatingGoal}
                  className={`py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-2 border-white disabled:opacity-75 ${
                    editingGoalId 
                      ? 'flex-1 bg-green-600 hover:bg-green-500 shadow-green-600/10 hover:shadow-green-600/20' 
                      : 'w-full bg-brand-blue hover:bg-brand-blue/95 shadow-brand-blue/10 hover:shadow-brand-blue/20'
                  }`}
                >
                  {creatingGoal ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : editingGoalId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Update Goal</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Reward Goal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Active Rewards Catalog List (Right Panel) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-sm flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-blue" />
                <span>Active Rewards Catalog</span>
              </h3>
              <span className="bg-brand-blue/10 text-brand-blue text-xs font-bold px-2 py-0.5 rounded-full border border-brand-blue/20">
                {goals.length} rewards
              </span>
            </div>

            <div className="p-4 overflow-y-auto max-h-[460px] flex-1">
              {loadingGoals ? (
                <div className="py-12 text-center text-slate-400 text-sm font-semibold">
                  Loading goals catalog...
                </div>
              ) : goals.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm">No active rewards</p>
                  <p className="text-xs text-slate-400">Use the form to add the first reward goal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {goals.map((g) => (
                    <div key={g.id || g.name} className="border border-slate-150 rounded-xl overflow-hidden flex flex-col bg-slate-50 relative group">
                      {/* Image Thumbnail */}
                      <div className="h-28 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-150 relative">
                        {g.imageUrl ? (
                          <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                        )}
                        <span className="absolute top-1.5 right-1.5 bg-brand-dark/90 text-brand-blue text-[9px] font-black px-2 py-0.5 rounded-full border border-brand-blue/20">
                          {g.pointsRequired.toLocaleString()} Pts
                        </span>
                      </div>
                      
                      {/* Reward Details, Edit & Delete */}
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-tight">
                          {g.name}
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(g)}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border border-slate-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                          >
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGoal(g.id || g.name)}
                            className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer border border-red-200 transition-all flex items-center justify-center gap-1 active:scale-95"
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </main>

      {/* Bill Inspector Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-brand-dark text-white p-5 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-base">Inspect Bill - {selectedClaim.contractorName}</h4>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Bill: {selectedClaim.billNumber} | Amt: ₹{selectedClaim.amount.toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedClaim(null)}
                className="p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Side-by-Side on Desktop) */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              {/* Image Preview Block */}
              <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center min-h-[300px]">
                {selectedClaim.imageUrl ? (
                  <img src={selectedClaim.imageUrl} alt="Full Bill" className="max-h-[450px] w-full object-contain" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-2">
                    <ImageIcon className="w-12 h-12" />
                    <span className="font-bold text-sm">No photo available</span>
                  </div>
                )}
              </div>

              {/* Data & Quick Action Details */}
              <div className="w-full md:w-64 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contractor UID</span>
                    <span className="text-xs font-semibold text-slate-700 block break-all">{selectedClaim.contractorId}</span>
                  </div>

                  {/* RFT and Points Calculation Card */}
                  {selectedClaim.status === 'pending' ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Running Feet (RFT) - Edit if needed
                        </label>
                        <input
                          type="number"
                          value={editRunningFeet}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditRunningFeet(val);
                            const claimId = selectedClaim.id || selectedClaim.timestamp;
                            setAdjustedRfts(prev => ({ ...prev, [claimId]: val }));
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand-blue rounded-lg text-slate-900 font-extrabold text-base focus:outline-none focus:ring-1 focus:ring-brand-blue"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Awardable Points
                        </span>
                        <span className="text-2xl font-black text-brand-blue block">
                          +{Math.round(parseFloat(editRunningFeet) || 0)} Pts
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">
                          1 RFT = 1 Point
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Approved RFT</span>
                        <span className="text-sm font-bold text-slate-800">{selectedClaim.runningFeet || 0} RFT</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Points Awarded</span>
                        <span className="text-xl font-black text-brand-blue">+{selectedClaim.points} Points</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Review Status</span>
                    <div className="capitalize font-black text-sm text-slate-800 flex items-center gap-1.5">
                      {selectedClaim.status === 'pending' && <ClockStatus />}
                      {selectedClaim.status === 'approved' && <ApproveStatus />}
                      {selectedClaim.status === 'rejected' && <RejectStatus />}
                    </div>
                  </div>
                </div>

                {/* Bottom Decision Row */}
                {selectedClaim.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(selectedClaim)}
                      className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(selectedClaim, editRunningFeet)}
                      className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-green-600/10 hover:shadow-green-600/20"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Approve</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Proof Modal */}
      {deliveringRedemption && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-brand-dark text-white p-5 flex justify-between items-center border-b border-slate-800">
              <div>
                <h4 className="font-extrabold text-base">Fulfill Redemption</h4>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {deliveringRedemption.contractorName} | {deliveringRedemption.goalName}
                </p>
              </div>
              <button 
                onClick={() => {
                  setDeliveringRedemption(null);
                  setDeliveryImagePreview(null);
                }}
                className="p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-white cursor-pointer active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase mb-2 pl-0.5">
                  Upload Delivery Photo (Optional)
                </label>
                <div className="relative">
                  {deliveryImagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-brand-blue max-h-60 flex justify-center bg-slate-900">
                      <img src={deliveryImagePreview} alt="Delivery Preview" className="max-h-60 object-contain" />
                      <button
                        type="button"
                        onClick={() => setDeliveryImagePreview(null)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-40 border-4 border-dashed border-slate-300 hover:border-brand-blue rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-50 hover:bg-brand-blue/5 text-center px-4">
                      <ImageIcon className="w-10 h-10 text-slate-400" />
                      <span className="text-sm font-black text-slate-500 uppercase tracking-wide">
                        Choose Delivery Photo
                      </span>
                      <span className="text-[10px] text-slate-400">Optional but recommended</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setDeliveryImagePreview(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs font-semibold text-slate-500">
                Marking this reward as delivered will notify <span className="text-slate-800 font-extrabold">{deliveringRedemption.contractorName}</span>.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveringRedemption(null);
                    setDeliveryImagePreview(null);
                  }}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider text-center cursor-pointer transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelivery}
                  className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-green-600/10 hover:shadow-green-600/20 disabled:opacity-75"
                >
                  {submittingDelivery ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Confirm Delivery</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Profile & Transaction Timeline Modal */}
      {selectedContractorForModal && (() => {
        const c = selectedContractorForModal;
        const timeline = getContractorTimeline(c.uid);
        const points = c.totalPoints || 0;
        const activeGoal = c.activeGoal;
        const progressPercent = activeGoal 
          ? Math.min(Math.round((points / activeGoal.pointsRequired) * 100), 100) 
          : 0;

        return (
          <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="bg-brand-dark text-white p-5 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 border-brand-blue bg-slate-800 flex items-center justify-center shrink-0 ${c.photo ? 'cursor-zoom-in hover:brightness-95' : ''}`}
                    onClick={() => {
                      if (c.photo) {
                        setZoomedPhoto({ url: c.photo, title: c.name });
                      }
                    }}
                  >
                    {c.photo ? (
                      <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base leading-tight">{c.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Mobile: {c.mobileNumber || 'N/A'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedContractorForModal(null)}
                  className="p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-white cursor-pointer active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
                {/* Profile Metrics Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Points</span>
                    <span className="text-2xl font-black text-brand-blue">{points.toLocaleString()} Pts</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Last Login</span>
                    <span className="text-xs font-extrabold text-slate-700 block mt-1.5 leading-snug">
                      {c.lastLoginTime ? formatDateTime(c.lastLoginTime) : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Active Goal</span>
                    <span className="text-xs font-extrabold text-slate-800 block mt-1.5 truncate" title={activeGoal?.name || 'None'}>
                      {activeGoal ? activeGoal.name : 'No Goal Set'}
                    </span>
                  </div>
                </div>

                {/* Active Goal Detail Card */}
                {activeGoal && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-250 shadow-sm space-y-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🎯 Active Goal Progress</h5>
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {activeGoal.imageUrl ? (
                          <img src={activeGoal.imageUrl} alt={activeGoal.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-extrabold text-slate-800 text-sm block leading-snug truncate">{activeGoal.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Target: {activeGoal.pointsRequired.toLocaleString()} Pts</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-600">
                        <span>{progressPercent}% Complete</span>
                        <span>{points.toLocaleString()} / {activeGoal.pointsRequired.toLocaleString()} Pts</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                        <div 
                          className="h-full bg-brand-blue rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline / Activity History */}
                <div className="space-y-4">
                  <h5 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">📋 Chronological Transaction & Activity History</h5>
                  
                  {timeline.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-semibold">
                      No transaction history found for this contractor.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                      {timeline.map((item, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline dot */}
                          <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                            item.type === 'claim' 
                              ? item.status === 'approved' ? 'bg-green-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500' 
                              : 'bg-brand-blue'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          </span>

                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                            <div className="flex gap-3 items-start">
                              {item.imageUrl && (
                                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                  <img src={item.imageUrl} alt="Document" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <span className="font-extrabold text-slate-800 text-xs block leading-tight">{item.title}</span>
                                <p className="text-[11px] text-slate-500 font-semibold mt-1 leading-snug">{item.description}</p>
                                <span className="text-[9px] text-slate-400 font-bold block mt-1">
                                  {formatDateTime(item.timestamp)}
                                </span>
                              </div>
                            </div>

                            <span className={`text-sm font-black whitespace-nowrap md:self-center ${
                              item.points.startsWith('-') ? 'text-red-600' : item.points.includes('Pending') ? 'text-amber-600' : item.points.includes('Rejected') ? 'text-slate-400' : 'text-green-600'
                            }`}>
                              {item.points}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Zoomed Photo Viewer Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-55 flex items-center justify-center p-4" onClick={() => setZoomedPhoto(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-12 right-0 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full cursor-pointer transition-all border border-slate-700 shadow-md"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-white p-3 rounded-2xl shadow-2xl border border-slate-200 max-w-full overflow-hidden">
              <img
                src={zoomedPhoto.url}
                alt={zoomedPhoto.title || 'Zoomed Photo'}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-inner"
              />
              {zoomedPhoto.title && (
                <p className="mt-3 text-center text-sm font-black text-slate-800 uppercase tracking-wider">
                  {zoomedPhoto.title}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub components for visual status
function ClockStatus() {
  return (
    <>
      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
      <span className="text-amber-600">Pending Review</span>
    </>
  );
}
function ApproveStatus() {
  return (
    <>
      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
      <span className="text-green-600">Approved & Added</span>
    </>
  );
}
function RejectStatus() {
  return (
    <>
      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
      <span className="text-red-600">Rejected / Ignored</span>
    </>
  );
}
