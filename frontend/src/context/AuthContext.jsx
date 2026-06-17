import { createContext, useContext, useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { auth } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isSigningUpRef = useRef(false);

  // Helper to load parent's children
  const loadParentData = async (email) => {
    try {
      const students = await api.students.getByParentEmail(email);
      setConnectedStudents(students);
      if (students.length > 0) {
        // Set first student as active by default
        setActiveStudent(students[0]);
      } else {
        setActiveStudent(null);
      }
    } catch (err) {
      console.error("Failed to load connected students:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isSigningUpRef.current) {
        // Skip automatic login sync during registration flow
        return;
      }
      if (firebaseUser) {
        try {
          // Retrieve active token
          const idToken = await firebaseUser.getIdToken();
          // Sync with local backend
          const dbUser = await api.auth.login(idToken);
          setCurrentUser(dbUser);
          if (dbUser.role === "parent") {
            await loadParentData(dbUser.email);
          } else {
            setConnectedStudents([]);
            setActiveStudent(null);
          }
        } catch (err) {
          console.error("Firebase session restoration backend sync failed:", err);
          setCurrentUser(null);
          await signOut(auth).catch(() => {});
        }
      } else {
        setCurrentUser(null);
        setConnectedStudents([]);
        setActiveStudent(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password, role) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Sign in to Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // 2. Fetch JWT ID token
      const idToken = await credential.user.getIdToken(true);
      // 3. Send token and expected role to MySQL backend for verification/sync
      const dbUser = await api.auth.login(idToken, role);
      
      setCurrentUser(dbUser);
      if (dbUser.role === "parent") {
        await loadParentData(dbUser.email);
      } else {
        setConnectedStudents([]);
        setActiveStudent(null);
      }
      return dbUser;
    } catch (err) {
      setError(err.message);
      await signOut(auth).catch(() => {});
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    setError(null);
    isSigningUpRef.current = true;
    try {
      // 1. Register parent in Firebase Auth or sign in if already exists (relational linking sync)
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (fbErr) {
        if (fbErr.code === "auth/email-already-in-use") {
          credential = await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw fbErr;
        }
      }
      // 2. Fetch JWT ID token
      const idToken = await credential.user.getIdToken(true);
      // 3. Send token to backend to link with pre-registered profile
      const dbUser = await api.auth.signup(idToken);
      
      setCurrentUser(dbUser);
      if (dbUser.role === "parent") {
        await loadParentData(dbUser.email);
      }
      return dbUser;
    } catch (err) {
      setError(err.message);
      await signOut(auth).catch(() => {});
      throw err;
    } finally {
      isSigningUpRef.current = false;
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      await api.auth.logout();
      setCurrentUser(null);
      setConnectedStudents([]);
      setActiveStudent(null);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectActiveStudent = (studentId) => {
    const student = connectedStudents.find(s => s.student_id === parseInt(studentId));
    if (student) {
      setActiveStudent(student);
    }
  };

  const refreshActiveStudent = async () => {
    if (activeStudent && currentUser && currentUser.role === "parent") {
      const students = await api.students.getByParentEmail(currentUser.email);
      setConnectedStudents(students);
      const updated = students.find(s => s.student_id === activeStudent.student_id);
      if (updated) {
        setActiveStudent(updated);
      }
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      return await api.auth.resetPassword(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    currentUser,
    connectedStudents,
    activeStudent,
    loading,
    error,
    login,
    signup,
    logout,
    resetPassword,
    selectActiveStudent,
    refreshActiveStudent
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
