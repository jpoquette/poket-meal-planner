"use client";
import Link from "next/link";
import { useLocalStorage } from "../../lib/useLocalStorage";

export default function HomePage() {
  const [pantryItems] = useLocalStorage("pantry", []);
  const [shoppingItems] = useLocalStorage("shopping", []);
  const [meals] = useLocalStorage("meals", []);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const expiringSoon = pantryItems.filter((item) => {
    if (!item.expirationDate) return false;
    const diff = (new Date(item.expirationDate) - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  const unpurchased = shoppingItems.filter((i) => !i.purchased);
  const todaysMeals = meals.filter((m) => m.date === todayStr);

  return (
    <div className="px-4 pt-6">
      <p className="text-sm text-gray-500 mb-1">{todayLabel}</p>
      <h1 className="text-2xl font-bold mb-5">Kitchen Overview</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/Pantry" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Pantry Items</p>
          <p className="text-4xl font-bold text-gray-900">{pantryItems.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {expiringSoon.length > 0
              ? <span className="text-orange-500">{expiringSoon.length} expiring soon</span>
              : "0 expiring soon"}
          </p>
        </Link>

        <Link href="/Shopping" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Shopping List</p>
          <p className="text-4xl font-bold text-gray-900">{unpurchased.length}</p>
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
                <span className="text-lg">{mealTypeEmoji(meal.mealType)}</span>
                <div>
                  <p className="font-medium text-sm">{meal.name}</p>
                  <p className="text-xs text-gray-400">{meal.mealType}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function mealTypeEmoji(type) {
  const map = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" };
  return map[type] || "🍽️";
}
