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
        supabase.from("pantry").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("pantry").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("expiration_date", todayStr).lte("expiration_date", in7daysStr),
        supabase.from("shopping").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("purchased", false),
        supabase.from("meals").select("*").eq("user_id", user.id).eq("date", todayStr),
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
        <Link href="/Pantry" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Pantry Items</p>
          <p className="text-4xl font-bold text-gray-900">{pantryCount}</p>
          <p className="text-xs mt-1">
            {expiringCount > 0
              ? <span className="text-orange-500">{expiringCount} expiring soon</span>
              : <span className="text-gray-400">0 expiring soon</span>}
          </p>
        </Link>

        <Link href="/Shopping" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Shopping List</p>
          <p className="text-4xl font-bold text-gray-900">{shoppingCount}</p>
          <p className="text-xs text-gray-400 mt-1">items to buy</p>
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Today&apos;s Meals</h2>
          <Link href="/Meals" className="text-sm text-green-600 font-medium">View all</Link>
        </div>

        {todaysMeals.length === 0 ? (
          <Link href="/Meals" className="flex flex-col items-center py-6 text-center">
            <span className="text-3xl mb-2">🍽️</span>
            <p className="text-gray-500 text-sm">No meals planned for today</p>
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
