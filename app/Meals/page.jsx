"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const EMPTY_FORM = { name: "", date: "", meal_type: "Dinner", pantry_search: "", additional_ingredients: "", recipe_link: "", notes: "" };

function toDateStr(date) { return date.toISOString().split("T")[0]; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function startOfWeek(date) { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; }

function MealsContent() {
  const user = useUser();
  const [meals, setMeals] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const today = toDateStr(new Date());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("meals").select("*").eq("user_id", user.id),
      supabase.from("pantry").select("id, name, quantity, unit").eq("user_id", user.id).order("name"),
    ]).then(([{ data: m }, { data: p }]) => {
      setMeals(m || []);
      setPantryItems(p || []);
      setLoading(false);
    });
  }, [user]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const selectedMeals = meals.filter((m) => m.date === selectedDate);
  const upcomingMeals = meals.filter((m) => m.date >= today && m.date <= toDateStr(addDays(new Date(), 7))).sort((a, b) => a.date.localeCompare(b.date) || MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type));

  const openAdd = () => { setForm({ ...EMPTY_FORM, date: selectedDate }); setModal("add"); };
  const openEdit = (meal) => { setForm({ name: meal.name, date: meal.date, meal_type: meal.meal_type || "Dinner", pantry_search: meal.pantry_search || "", additional_ingredients: meal.additional_ingredients || "", recipe_link: meal.recipe_link || "", notes: meal.notes || "" }); setModal(meal.id); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    if (modal === "add") {
      const { data } = await supabase.from("meals").insert({ ...form, user_id: user.id }).select().single();
      if (data) setMeals((prev) => [...prev, data]);
    } else {
      const { data } = await supabase.from("meals").update(form).eq("id", modal).select().single();
      if (data) setMeals((prev) => prev.map((m) => m.id === modal ? data : m));
    }
    setSaving(false);
    setModal(null);
  };

  const handleDelete = async (id) => {
    await supabase.from("meals").delete().eq("id", id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    setModal(null);
  };

  const filteredPantry = pantryItems.filter((p) => form.pantry_search && p.name.toLowerCase().includes(form.pantry_search.toLowerCase()));
  const selectedDayLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Meal Planning</h1>
      <p className="text-sm text-gray-500 mb-4">{monthLabel}</p>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1 text-gray-400 hover:text-gray-600">‹</button>
        <p className="flex-1 text-center text-sm font-medium text-gray-600">{weekLabel}</p>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1 text-gray-400 hover:text-gray-600">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {weekDays.map((d) => {
          const ds = toDateStr(d);
          const isToday = ds === today;
          const isSelected = ds === selectedDate;
          const hasMeals = meals.some((m) => m.date === ds);
          return (
            <button key={ds} onClick={() => setSelectedDate(ds)}
              className={`flex flex-col items-center py-2 rounded-xl transition-colors ${isSelected ? "bg-green-500 text-white" : isToday ? "bg-green-50 text-green-700" : "text-gray-600"}`}>
              <span className="text-xs font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="text-sm font-bold">{d.getDate()}</span>
              {hasMeals && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-green-400"}`} />}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">{selectedDayLabel}</h2>
          <button onClick={openAdd} className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-green-600">Add Meal</button>
        </div>
        {selectedMeals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🍽️</p>
            <p className="text-sm text-gray-500">No meals planned</p>
            <p className="text-xs text-gray-400">Plan your meals for this day</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedMeals.sort((a, b) => MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type)).map((meal) => (
              <li key={meal.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(meal)}>
                <span className="text-xl">{mealEmoji(meal.meal_type)}</span>
                <div className="flex-1"><p className="font-semibold text-sm text-gray-900">{meal.name}</p><p className="text-xs text-gray-400">{meal.meal_type}</p></div>
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
            {upcomingMeals.map((meal) => (
              <li key={meal.id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 shadow-sm cursor-pointer" onClick={() => openEdit(meal)}>
                <span className="text-lg">{mealEmoji(meal.meal_type)}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{meal.name}</p>
                  <p className="text-xs text-gray-400">{new Date(meal.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {meal.meal_type}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col" style={{maxHeight: '90vh'}}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold">{modal === "add" ? "Plan a Meal" : "Edit Meal"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                <Field label="Meal Name"><input className={inputCls} placeholder="e.g., Spaghetti Carbonara" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Date"><input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></Field>
                <Field label="Meal Type"><select className={inputCls} value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value })}>{MEAL_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Use from Pantry">
                  <input className={inputCls} placeholder="Search pantry..." value={form.pantry_search} onChange={(e) => setForm({ ...form, pantry_search: e.target.value })} />
                  {form.pantry_search && (
                    <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                      {filteredPantry.length === 0
                        ? <li className="px-3 py-2 text-xs text-gray-400">No pantry items found</li>
                        : filteredPantry.map((p) => <li key={p.id} className="px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0">{p.name} — {p.quantity} {p.unit}</li>)}
                    </ul>
                  )}
                </Field>
                <Field label="Additional Ingredients"><textarea className={inputCls} placeholder="Any other ingredients not in pantry..." rows={2} value={form.additional_ingredients} onChange={(e) => setForm({ ...form, additional_ingredients: e.target.value })} /></Field>
                <Field label="Recipe Link (optional)"><input className={inputCls} type="url" placeholder="https://..." value={form.recipe_link} onChange={(e) => setForm({ ...form, recipe_link: e.target.value })} /></Field>
                <Field label="Notes"><textarea className={inputCls} placeholder="Optional notes..." rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
                {modal !== "add" && <button type="button" onClick={() => handleDelete(modal)} className="px-4 py-2.5 rounded-xl text-sm text-red-500 border border-red-200 hover:bg-red-50">Delete</button>}
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MealsPage() {
  return <AuthGuard><MealsContent /></AuthGuard>;
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>{children}</div>;
}

function mealEmoji(type) {
  return { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snack: "🍎" }[type] || "🍽️";
}

const inputCls = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
