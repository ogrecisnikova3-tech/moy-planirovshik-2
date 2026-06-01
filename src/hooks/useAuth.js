import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, firebaseAuthApi, hasFirebaseConfig } from "../firebase/config";

const demoUser = {
  uid: "demo-user",
  email: "demo@local.app",
  displayName: "Локальный режим"
};

export function useAuth() {
  const [user, setUser] = useState(hasFirebaseConfig ? null : demoUser);
  const [loading, setLoading] = useState(hasFirebaseConfig);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setError("");
      setUser(nextUser);
      setLoading(false);
    }, (authError) => {
      setError(authError.message);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    error,
    hasFirebaseConfig,
    signIn: firebaseAuthApi.signIn,
    signUp: firebaseAuthApi.signUp,
    signInGoogle: firebaseAuthApi.signInGoogle,
    signOut: firebaseAuthApi.signOut
  };
}
