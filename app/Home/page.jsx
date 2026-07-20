"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

function HomeContent() {
  const user = useUser();
  const [pantryCount, setPantryCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [todaysMeals, setTodaysMeals] = useState([]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const in7days = new Date(today);
  in7days.setDate(today.getDate() + 7);
  const in7daysStr = in7days.toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ count: pCount }, { count: expCount }, { count: sCount }, { data: meals }] = await Promise.all([
        supabase.from("mp_pantry").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("mp_pantry").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("expiration_date", todayStr).lte("expiration_date", in7daysStr),
        supabase.from("mp_shopping").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("purchased", false),
        supabase.from("mp_meals").select("*").eq("user_id", user.id).eq("date", todayStr),
      ]);
      setPantryCount(pCount || 0);
      setExpiringCount(expCount || 0);
      setShoppingCount(sCount || 0);
      setTodaysMeals(meals || []);
    }
    load();
  }, [user]);

  return (
    <div className="px-4 pt-6">
      <p className="text-sm text-gray-500 mb-1">{todayLabel}</p>
      <h1 className="text-2xl font-bold mb-5">Kitchen Overview</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/Pantry" className="bg-[#eaf4ee] rounded-2xl p-4 shadow-sm border border-[#d0e8d8] hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Pantry Items</p>
          <div className="flex items-center justify-between">
            <p className="text-4xl font-bold text-gray-900">{pantryCount}</p>
            <span className="text-2xl text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </span>
          </div>
          <p className="text-xs mt-1">
            {expiringCount > 0
              ? <span className="text-orange-500">{expiringCount} expiring soon</span>
              : <span className="text-gray-400">0 expiring soon</span>}
          </p>
        </Link>

        <Link href="/Shopping" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Shopping List</p>
          <div className="flex items-center justify-between">
            <p className="text-4xl font-bold text-blue-600">{shoppingCount}</p>
            <span className="text-blue-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">items to buy</p>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Today&apos;s Meals</h2>
          <Link href="/Meals" className="text-sm text-green-600 font-medium flex items-center gap-1">
            View all <span>›</span>
          </Link>
        </div>

        {todaysMeals.length === 0 ? (
          <Link href="/Meals" className="flex flex-col items-center py-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No meals planned for today</p>
            <p className="text-gray-400 text-xs mt-1">Tap to plan your meals</p>
          </Link>
        ) : (
          <ul className="space-y-2">
            {todaysMeals.map((meal) => (
              <li key={meal.id} className="flex items-center gap-3">
                <span className="text-lg">{mealTypeEmoji(meal.meal_type)}</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">{meal.name}</p>
                  <p className="text-xs text-gray-400">{meal.meal_type}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/Pantry" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">Pantry</span>
        </Link>
        <Link href="/Shopping" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">Shopping</span>
        </Link>
        <Link href="/Meals" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-700">Meals</span>
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <AuthGuard><HomeContent /></AuthGuard>;
}

function mealTypeEmoji(type) {
  const map = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" };
  return map[type] || "🍽️";
}
