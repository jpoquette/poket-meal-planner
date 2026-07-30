"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const expiry = localStorage.getItem("poket-auth-expiry");
    const isWithin90Days = expiry && Date.now() < Number(expiry);

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
      } else if (isWithin90Days) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: process.env.NEXT_PUBLIC_USER_EMAIL,
          password: process.env.NEXT_PUBLIC_USER_PASSWORD,
        });
        setUser(signInData.session?.user ?? null);
      } else {
        localStorage.removeItem("poket-auth-expiry");
        setUser(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useUser() {
  return useContext(AuthContext);
}
