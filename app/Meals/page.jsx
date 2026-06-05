"use client";
import { useState } from "react";
import { useLocalStorage } from "../../lib/useLocalStorage";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const EMPTY_FORM = { name: "", date: "", mealType: "Dinner", pantrySearch: "", additionalIngredients: "", recipeLink: "", notes: "" };

function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function MealsPage() {
  const [meals, setMeals, loaded] = useLocalStorage("meals", []);
  const [pantryItems] = useLocalStorage("pantry", []);
  const [view, setView] = useState("1 Week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  if (!loaded) return null;

  const today = toDateStr(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => {
    setWeekStart(startOfWeek(new Date()));
    setSelectedDate(today);
  };

  const selectedMeals = meals.filter((m) => m.date === selectedDate);

  const upcomingMeals = meals
    .filter((m) => m.date >= today && m.date <= toDateStr(addDays(new Date(), 7)))
    .sort((a, b) => a.date.localeCompare(b.date) || MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType));

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, date: selectedDate });
    setModal("add");
  };

  const openEdit = (meal) => {
    setForm({ ...meal });
    setModal(meal.id);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (modal === "add") {
      setMeals([...meals, { ...form, id: crypto.randomUUID() }]);
    } else {
      setMeals(meals.map((m) => (m.id === modal ? { ...form, id: modal } : m)));
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    setMeals(meals.filter((m) => m.id !== id));
    setModal(null);
  };

  const filteredPantry = pantryItems.filter((p) =>
    form.pantrySearch && p.name.toLowerCase().includes(form.pantrySearch.toLowerCase())
  );

  const selectedDay = new Date(selectedDate + "T12:00:00");
  const selectedDayLabel = selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Meal Planning</h1>
      <p className="text-sm text-gray-500 mb-4">{monthLabel}</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["Today", "1 Week", "2 Weeks", "Month"].map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); if (v === "Today") goToday(); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              view === v ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={prevWeek} className="p-1 text-gray-400 hover:text-gray-600">‹</button>
        <p className="flex-1 text-center text-sm font-medium text-gray-600">{weekLabel}</p>
        <button onClick={nextWeek} className="p-1 text-gray-400 hover:text-gray-600">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {weekDays.map((d) => {
          const ds = toDateStr(d);
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const hasMeals = meals.some((m) => m.date === ds);
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                isSelected ? "bg-green-500 text-white" : isToday ? "bg-green-50 text-green-700" : "text-gray-600"
              }`}
            >
              <span className="text-xs font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
              {hasMeals && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-green-400"}`} />}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{selectedDayLabel}</h2>
          <button onClick={openAdd} className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-green-600">
            Add Meal
          </button>
        </div>
        {selectedMeals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🍽️</p>
            <p className="text-sm text-gray-500">No meals planned</p>
            <p className="text-xs text-gray-400">Plan your meals for this day</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedMeals
              .sort((a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType))
              .map((meal) => (
                <li key={meal.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(meal)}>
                  <span className="text-xl">{mealEmoji(meal.mealType)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{meal.name}</p>
                    <p className="text-xs text-gray-400">{meal.mealType}</p>
                  </div>
                  <span className="text-gray-300 text-xs">›</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {upcomingMeals.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Upcoming This Week</h2>
          <ul className="space-y-2">
            {upcomingMeals.map((meal) => {
              const d = new Date(meal.date + "T12:00:00");
              return (
                <li key={meal.id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm cursor-pointer" onClick={() => openEdit(meal)}>
                  <span className="text-lg">{mealEmoji(meal.mealType)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{meal.name}</p>
                    <p className="text-xs text-gray-400">
                      {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {meal.mealType}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{modal === "add" ? "Plan a Meal" : "Edit Meal"}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <Field label="Meal Name">
                  <input className={inputCls} placeholder="e.g., Spaghetti Carbonara" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Field>
                <Field label="Date">
                  <input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </Field>
                <Field label="Meal Type">
                  <select className={inputCls} value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })}>
                    {MEAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Use from Pantry">
                  <input
                    className={inputCls}
                    placeholder="Search pantry..."
                    value={form.pantrySearch}
                    onChange={(e) => setForm({ ...form, pantrySearch: e.target.value })}
                  />
                  {form.pantrySearch && (
                    <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                      {filteredPantry.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-400">No pantry items found</li>
                      ) : (
                        filteredPantry.map((p) => (
                          <li key={p.id} className="px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                            {p.name} — {p.quantity} {p.unit}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </Field>
                <Field label="Additional Ingredients">
                  <textarea className={inputCls} placeholder="Any other ingredients not in pantry..." rows={2} value={form.additionalIngredients} onChange={(e) => setForm({ ...form, additionalIngredients: e.target.value })} />
                </Field>
                <Field label="Recipe Link (optional)">
                  <input className={inputCls} type="url" placeholder="https://..." value={form.recipeLink} onChange={(e) => setForm({ ...form, recipeLink: e.target.value })} />
                </Field>
                <Field label="Notes">
                  <textarea className={inputCls} placeholder="Optional notes..." rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Field>
                <div className="flex gap-2 pt-1">
                  {modal !== "add" && (
                    <button type="button" onClick={() => handleDelete(modal)} className="px-4 py-2 rounded-xl text-sm text-red-500 border border-red-200 hover:bg-red-50">Delete</button>
                  )}
                  <button type="button" onClick={() => setModal(null)} className="flex-1 px-4 py-2 rounded-xl text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-xl text-sm bg-green-500 text-white font-medium hover:bg-green-600">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function mealEmoji(type) {
  const map = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" };
  return map[type] || "🍽️";
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
