"use client";
import { useState, useEffect } from "react";

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setValue(JSON.parse(item));
    } catch {}
    setLoaded(true);
  }, [key]);

  const set = (newValue) => {
    const val = typeof newValue === "function" ? newValue(value) : newValue;
    setValue(val);
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  };

  return [value, set, loaded];
}
