import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  return apiKey && !apiKey.includes('PLACEHOLDER') && apiKey !== 'YOUR_FIREBASE_API_KEY_HERE';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  


  // Persistent points for the mock contractor (defaults to 2450)
  const [mockContractorPoints, setMockContractorPoints] = useState(() => {
    const saved = localStorage.getItem('nilkamal_mock_contractor_points');
    if (!saved) {
      localStorage.setItem('nilkamal_mock_contractor_points', '2450');
      return 2450;
    }
    return parseInt(saved, 10);
  });

  // Mock database for when Firebase is not configured or for testing
  const [mockUsers, setMockUsers] = useState({
    'contractor': {
      uid: 'mock-contractor-uid',
      email: 'contractor@test.com',
      name: 'Ramesh Kumar (Contractor)',
      role: 'contractor',
      totalPoints: mockContractorPoints
    },
    'admin': {
      uid: 'mock-admin-uid',
      email: 'admin@test.com',
      name: 'Nilkamal Master Admin',
      role: 'admin',
      totalPoints: 0
    }
  });

  // Keep mockUsers in sync with points
  useEffect(() => {
    setMockUsers(prev => ({
      ...prev,
      contractor: {
        ...prev.contractor,
        totalPoints: mockContractorPoints
      }
    }));
  }, [mockContractorPoints]);

  // Keep mock user session in localStorage in sync when userData updates in mock mode
  useEffect(() => {
    if (user?.isMock && userData) {
      localStorage.setItem('nilkamal_mock_user', JSON.stringify(userData));
    }
  }, [userData, user?.isMock]);

  // Get active role
  const getActiveRole = () => {
    return userData?.role || null;
  };

  const getMockActiveGoal = () => {
    const saved = localStorage.getItem('nilkamal_mock_active_goal');
    return saved ? JSON.parse(saved) : null;
  };

  // Get active user data
  const getActiveUserData = () => {
    // Fallback for mock contractor points synchronization
    if (user?.isMock && userData?.role === 'contractor') {
      if (user.uid === 'mock-contractor-uid') {
        return {
          ...userData,
          totalPoints: mockContractorPoints,
          activeGoal: getMockActiveGoal()
        };
      } else {
        return {
          ...userData,
          totalPoints: mockContractorPoints,
          activeGoal: userData?.activeGoal || null
        };
      }
    }
    
    return userData;
  };

  useEffect(() => {
    // Initialize mock goals database
    const savedGoals = localStorage.getItem('nilkamal_mock_goals');
    if (!savedGoals) {
      const defaultGoals = [
        {
          id: 'mock-goal-1',
          name: 'Nilkamal Premium Plastic Chair',
          pointsRequired: 500,
          imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&auto=format&fit=crop&q=60'
        },
        {
          id: 'mock-goal-2',
          name: 'Nilkamal Ergonomic Office Chair',
          pointsRequired: 1500,
          imageUrl: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500&auto=format&fit=crop&q=60'
        },
        {
          id: 'mock-goal-3',
          name: 'Professional Power Tool Kit',
          pointsRequired: 2500,
          imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&auto=format&fit=crop&q=60'
        },
        {
          id: 'mock-goal-4',
          name: 'Nilkamal 3-Seater Luxury Sofa',
          pointsRequired: 4000,
          imageUrl: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=500&auto=format&fit=crop&q=60'
        }
      ];
      localStorage.setItem('nilkamal_mock_goals', JSON.stringify(defaultGoals));
    }

    if (!isFirebaseConfigured()) {
      console.log("Firebase is not fully configured. Running in Mock Mode for testing.");
      // Check local storage for mock session
      const savedMockUser = localStorage.getItem('nilkamal_mock_user');
      if (savedMockUser) {
        const parsed = JSON.parse(savedMockUser);
        setUser({ uid: parsed.uid, email: parsed.email, isMock: true });
        setUserData(parsed);
        if (parsed.role === 'contractor') {
          if (parsed.uid === 'mock-contractor-uid') {
            const rameshPts = parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10);
            setMockContractorPoints(rameshPts);
          } else {
            setMockContractorPoints(parsed.totalPoints || 0);
          }
        }
      }
      setLoading(false);
      return;
    }

    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Clear mobile/mock sessions when a firebaseUser is logged in directly
        localStorage.removeItem('nilkamal_logged_in_mobile_uid');
        localStorage.removeItem('nilkamal_mock_user');
        setUser(firebaseUser);
        try {
          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            setUserData(userDocSnap.data());
          } else {
            // Self-healing migration / matching by phone number
            let matchedData = null;
            let matchedId = null;
            if (firebaseUser.phoneNumber) {
              const last10 = firebaseUser.phoneNumber.replace(/\D/g, '').slice(-10);
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('mobileNumber', '==', last10));
              const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                matchedData = docSnap.data();
                matchedId = docSnap.id;
              }
            }

            if (matchedData) {
              // Copy data to new UID and delete old document
              const updatedData = { ...matchedData, uid: firebaseUser.uid };
              await setDoc(userDocRef, updatedData);
              setUserData(updatedData);

              if (matchedId !== firebaseUser.uid) {
                // Delete old doc
                const { deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'users', matchedId));

                // Migrate claims
                const claimsRef = collection(db, 'claims');
                const claimsQ = query(claimsRef, where('contractorId', '==', matchedId));
                const claimsSnap = await getDocs(claimsQ);
                for (const claimD of claimsSnap.docs) {
                  await updateDoc(doc(db, 'claims', claimD.id), { contractorId: firebaseUser.uid });
                }

                // Migrate redemptions
                const redemptionsRef = collection(db, 'redemptions');
                const redemptionsQ = query(redemptionsRef, where('contractorId', '==', matchedId));
                const redemptionsSnap = await getDocs(redemptionsQ);
                for (const redD of redemptionsSnap.docs) {
                  await updateDoc(doc(db, 'redemptions', redD.id), { contractorId: firebaseUser.uid });
                }
                console.log(`Successfully migrated user ${matchedId} to Firebase UID ${firebaseUser.uid}`);
              }
            } else {
              // Document doesn't exist, create a default contractor document
              const defaultData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || (firebaseUser.phoneNumber || 'User'),
                role: 'contractor',
                totalPoints: 0,
                mobileNumber: firebaseUser.phoneNumber ? firebaseUser.phoneNumber.replace(/\D/g, '').slice(-10) : ''
              };
              await setDoc(userDocRef, defaultData);
              setUserData(defaultData);
            }
          }
        } catch (err) {
          console.error("Error fetching user data from Firestore:", err);
          setError("Failed to fetch user profile. Firestore permissions might need checking.");
        }
      } else {
        // If no standard firebase auth user, check for mock/mobile persisted session
        const savedMockUser = localStorage.getItem('nilkamal_mock_user');
        const mobileUid = localStorage.getItem('nilkamal_logged_in_mobile_uid');

        if (savedMockUser) {
          const parsed = JSON.parse(savedMockUser);
          setUser({ uid: parsed.uid, email: parsed.email, isMock: true });
          setUserData(parsed);
          if (parsed.role === 'contractor') {
            if (parsed.uid === 'mock-contractor-uid') {
              const rameshPts = parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10);
              setMockContractorPoints(rameshPts);
            } else {
              setMockContractorPoints(parsed.totalPoints || 0);
            }
          }
        } else if (mobileUid) {
          try {
            const userDocRef = doc(db, 'users', mobileUid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const data = { uid: userDocSnap.id, ...userDocSnap.data() };
              setUser({ uid: mobileUid, email: data.email || `${data.mobileNumber}@nilkamal.com` });
              setUserData(data);
            } else {
              localStorage.removeItem('nilkamal_logged_in_mobile_uid');
              setUser(null);
              setUserData(null);
            }
          } catch (err) {
            console.error("Error fetching persisted mobile user:", err);
            setUser(null);
            setUserData(null);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);



  // Sign Out Function
  const logout = async () => {
    setError('');
    setLoading(true);

    // Clear all persisted sessions
    localStorage.removeItem('nilkamal_logged_in_mobile_uid');
    localStorage.removeItem('nilkamal_mock_user');
    localStorage.removeItem('nilkamal_mock_active_goal');

    if (user?.isMock) {
      setUser(null);
      setUserData(null);
      setLoading(false);
      return;
    }

    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserData(null);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };



  // Add/Subtract Points (Works for both Firebase & local Mock storage)
  const updateContractorPoints = async (contractorId, pointsToAdd) => {
    const isMockMode = !isFirebaseConfigured() || user?.isMock;
    if (isMockMode || contractorId === 'mock-contractor-uid') {
      let updatedPoints = 0;
      if (contractorId === 'mock-contractor-uid') {
        const current = parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10);
        updatedPoints = current + pointsToAdd;
        localStorage.setItem('nilkamal_mock_contractor_points', updatedPoints.toString());
      }

      // Also update in the list
      const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
      if (savedContractors) {
        const list = JSON.parse(savedContractors);
        const updatedList = list.map(c => {
          if (c.uid === contractorId || (contractorId === 'mock-contractor-uid' && c.uid === 'mock-contractor-uid')) {
            const currentPts = c.totalPoints !== undefined ? c.totalPoints : (contractorId === 'mock-contractor-uid' ? 2450 : 0);
            updatedPoints = currentPts + pointsToAdd;
            return { ...c, totalPoints: updatedPoints };
          }
          return c;
        });
        localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(updatedList));
      } else if (contractorId !== 'mock-contractor-uid') {
        updatedPoints = pointsToAdd;
      }

      // Sync mock state if the updated user is the currently logged in user
      if (user && (user.uid === contractorId || (contractorId === 'mock-contractor-uid' && user.uid === 'mock-contractor-uid'))) {
        setMockContractorPoints(updatedPoints);
      }

      return { success: true, newPoints: updatedPoints };
    }

    try {
      const userRef = doc(db, 'users', contractorId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentPoints = userSnap.data().totalPoints || 0;
        const updatedPoints = currentPoints + pointsToAdd;
        await updateDoc(userRef, {
          totalPoints: updatedPoints
        });
        if (user && user.uid === contractorId) {
          setUserData(prev => prev ? { ...prev, totalPoints: updatedPoints } : null);
        }
        return { success: true, newPoints: updatedPoints };
      }
      return { success: false, error: 'User document not found' };
    } catch (err) {
      console.error("Error updating contractor points in Firestore:", err);
      // Mock fallback in case of Firestore writing errors
      const current = parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10);
      const updated = current + pointsToAdd;
      localStorage.setItem('nilkamal_mock_contractor_points', updated.toString());
      setMockContractorPoints(updated);
      return { success: true, newPoints: updated };
    }
  };

  // Set Active Goal (Works for both Firebase & local Mock storage)
  const updateActiveGoal = async (contractorId, activeGoal) => {
    const isMockMode = !isFirebaseConfigured() || user?.isMock;
    if (isMockMode || contractorId === 'mock-contractor-uid') {
      if (contractorId === 'mock-contractor-uid') {
        if (activeGoal) {
          localStorage.setItem('nilkamal_mock_active_goal', JSON.stringify(activeGoal));
        } else {
          localStorage.removeItem('nilkamal_mock_active_goal');
        }
      }

      // Also update in the list
      const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
      if (savedContractors) {
        const list = JSON.parse(savedContractors);
        const updatedList = list.map(c => {
          if (c.uid === contractorId || (contractorId === 'mock-contractor-uid' && c.uid === 'mock-contractor-uid')) {
            return { ...c, activeGoal };
          }
          return c;
        });
        localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(updatedList));
      }

      setUserData(prev => prev ? { ...prev, activeGoal } : null);
      return { success: true };
    }

    try {
      const userRef = doc(db, 'users', contractorId);
      await updateDoc(userRef, {
        activeGoal: activeGoal
      });
      setUserData(prev => prev ? { ...prev, activeGoal } : null);
      return { success: true };
    } catch (err) {
      console.error("Error updating active goal in Firestore:", err);
      // Fallback
      if (activeGoal) {
        localStorage.setItem('nilkamal_mock_active_goal', JSON.stringify(activeGoal));
      } else {
        localStorage.removeItem('nilkamal_mock_active_goal');
      }
      setUserData(prev => prev ? { ...prev, activeGoal } : null);
      return { success: true };
    }
  };

  const loginWithOtp = async (mobileNumber) => {
    setError('');
    setLoading(true);
    const normalizedMobile = mobileNumber.trim();
    const isMockMode = !isFirebaseConfigured() || user?.isMock;

    if (isMockMode) {
      const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
      const list = savedContractors ? JSON.parse(savedContractors) : [];

      const defaultContractor = {
        uid: 'mock-contractor-uid',
        email: 'contractor@test.com',
        name: 'Ramesh Kumar (Contractor)',
        role: 'contractor',
        mobileNumber: '9876543210',
        totalPoints: mockContractorPoints,
        lastLoginTime: Date.now()
      };

      const defaultAdmin = {
        uid: 'mock-admin-uid',
        email: 'admin@test.com',
        name: 'Nilkamal Master Admin',
        role: 'admin',
        mobileNumber: '9876543211',
        totalPoints: 0,
        lastLoginTime: Date.now()
      };

      let found = list.find(c => c.mobileNumber === normalizedMobile);
      if (!found && normalizedMobile === '9876543210') {
        found = defaultContractor;
      } else if (!found && normalizedMobile === '9876543211') {
        found = defaultAdmin;
      }

      if (!found) {
        setLoading(false);
        const msg = "Mobile number not registered.";
        setError(msg);
        throw new Error(msg);
      }

      found.lastLoginTime = Date.now();
      const updatedList = list.map(c => c.uid === found.uid ? found : c);
      if (!list.find(c => c.uid === found.uid) && found.uid !== 'mock-contractor-uid' && found.uid !== 'mock-admin-uid') {
        updatedList.push(found);
      }
      localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(updatedList));

      const loggedInUser = { uid: found.uid, email: found.email || `${normalizedMobile}@nilkamal.com`, isMock: true };
      setUser(loggedInUser);
      setUserData(found);
      localStorage.setItem('nilkamal_mock_user', JSON.stringify(found));
      if (found.uid === 'mock-contractor-uid') {
        const rameshPts = parseInt(localStorage.getItem('nilkamal_mock_contractor_points') || '2450', 10);
        setMockContractorPoints(rameshPts);
      } else if (found.role === 'contractor') {
        setMockContractorPoints(found.totalPoints || 0);
      }
      setLoading(false);
      return { success: true, role: found.role || 'contractor' };
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('mobileNumber', '==', normalizedMobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setLoading(false);
        const msg = "Mobile number not registered.";
        setError(msg);
        throw new Error(msg);
      }

      const userDoc = querySnapshot.docs[0];
      const foundData = { uid: userDoc.id, ...userDoc.data() };

      const userRef = doc(db, 'users', userDoc.id);
      await updateDoc(userRef, { lastLoginTime: Date.now() });
      foundData.lastLoginTime = Date.now();

      setUser({ uid: userDoc.id, email: foundData.email || `${normalizedMobile}@nilkamal.com` });
      setUserData(foundData);
      localStorage.setItem('nilkamal_logged_in_mobile_uid', userDoc.id);
      localStorage.removeItem('nilkamal_mock_user');
      setLoading(false);
      return { success: true, role: foundData.role || 'contractor' };
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const registerContractor = async (name, mobileNumber, photoBase64) => {
    setError('');
    setLoading(true);
    const normalizedMobile = mobileNumber.trim();
    const newUid = 'contractor-' + Date.now();
    const isMockMode = !isFirebaseConfigured();

    const newContractor = {
      uid: newUid,
      name,
      mobileNumber: normalizedMobile,
      photo: photoBase64,
      role: 'contractor',
      totalPoints: 0,
      activeGoal: null,
      lastLoginTime: Date.now(),
      lastTransaction: { description: 'Registered account', timestamp: Date.now() }
    };

    if (isMockMode) {
      const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
      const list = savedContractors ? JSON.parse(savedContractors) : [];
      if (list.find(c => c.mobileNumber === normalizedMobile) || normalizedMobile === '9876543210' || normalizedMobile === '9876543211') {
        setLoading(false);
        const msg = "Mobile number already registered.";
        setError(msg);
        throw new Error(msg);
      }

      list.push(newContractor);
      localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(list));

      setUser({ uid: newUid, email: `${normalizedMobile}@nilkamal.com`, isMock: true });
      setUserData(newContractor);
      localStorage.setItem('nilkamal_mock_user', JSON.stringify(newContractor));
      setMockContractorPoints(0);
      setLoading(false);
      return { success: true, role: 'contractor' };
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('mobileNumber', '==', normalizedMobile));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setLoading(false);
        const msg = "Mobile number already registered.";
        setError(msg);
        throw new Error(msg);
      }

      const userRef = doc(db, 'users', newUid);
      await setDoc(userRef, newContractor);

      setUser({ uid: newUid, email: `${normalizedMobile}@nilkamal.com` });
      setUserData(newContractor);
      localStorage.setItem('nilkamal_logged_in_mobile_uid', newUid);
      localStorage.removeItem('nilkamal_mock_user');
      setLoading(false);
      return { success: true, role: 'contractor' };
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  };

  const updateContractorTransaction = async (contractorId, description) => {
    const isMockMode = !isFirebaseConfigured() || user?.isMock;
    const lastTransaction = { description, timestamp: Date.now() };

    if (isMockMode || contractorId === 'mock-contractor-uid') {
      const savedContractors = localStorage.getItem('nilkamal_mock_contractors_list');
      if (savedContractors) {
        const list = JSON.parse(savedContractors);
        const updatedList = list.map(c => {
          if (c.uid === contractorId || (contractorId === 'mock-contractor-uid' && c.uid === 'mock-contractor-uid')) {
            return { ...c, lastTransaction };
          }
          return c;
        });
        localStorage.setItem('nilkamal_mock_contractors_list', JSON.stringify(updatedList));
      }

      if (userData && (userData.uid === contractorId || contractorId === 'mock-contractor-uid')) {
        setUserData(prev => prev ? { ...prev, lastTransaction } : null);
      }
      return { success: true };
    }

    try {
      const userRef = doc(db, 'users', contractorId);
      await updateDoc(userRef, { lastTransaction });
      if (userData && userData.uid === contractorId) {
        setUserData(prev => prev ? { ...prev, lastTransaction } : null);
      }
      return { success: true };
    } catch (err) {
      console.error("Error updating last transaction:", err);
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    userData: getActiveUserData(),
    loading,
    error,
    logout,
    activeRole: getActiveRole(),
    isMock: user?.isMock || false,
    updateContractorPoints,
    updateActiveGoal,
    setUserData,
    loginWithOtp,
    registerContractor,
    updateContractorTransaction
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
