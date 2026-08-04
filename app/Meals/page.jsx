"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const EMPTY_FORM = { name: "", date: "", meal_type: "Dinner", pantry_search: "", additional_ingredients: "", recipe_link: "", notes: "" };
const VIEWS = ["1 Week", "2 Weeks", "Month"];

function toDateStr(date) { return date.toISOString().split("T")[0]; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function startOfWeek(date) { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }

function MealsContent() {
  const user = useUser();
  const [meals, setMeals] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("1 Week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [aiModal, setAiModal] = useState(false);
  const [aiStep, setAiStep] = useState("select");
  const [aiSelected, setAiSelected] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingMore, setAiLoadingMore] = useState(false);
  const [aiRecipes, setAiRecipes] = useState([]);
  const [aiError, setAiError] = useState(null);
  const [aiDetailRecipe, setAiDetailRecipe] = useState(null);
  const [aiShoppingItems, setAiShoppingItems] = useState([]);
  const [aiAddingToCart, setAiAddingToCart] = useState(false);

  const today = toDateStr(new Date());

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("mp_meals").select("*").eq("user_id", user.id),
      supabase.from("mp_pantry").select("id, name, quantity, unit").eq("user_id", user.id).order("name"),
    ]).then(([{ data: m }, { data: p }]) => {
      setMeals(m || []);
      setPantryItems(p || []);
      setLoading(false);
    });
  }, [user]);

  const goToToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now));
    setMonthStart(startOfMonth(now));
    setSelectedDate(toDateStr(now));
  };

  const navigatePrev = () => {
    if (view === "Month") setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (view === "2 Weeks") setWeekStart((d) => addDays(d, -14));
    else setWeekStart((d) => addDays(d, -7));
  };
  const navigateNext = () => {
    if (view === "Month") setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (view === "2 Weeks") setWeekStart((d) => addDays(d, 14));
    else setWeekStart((d) => addDays(d, 7));
  };

  const getDays = () => {
    if (view === "Month") {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    }
    const count = view === "2 Weeks" ? 14 : 7;
    return Array.from({ length: count }, (_, i) => addDays(weekStart, i));
  };

  const days = getDays();

  const getPeriodLabel = () => {
    if (view === "Month") return monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const last = days[days.length - 1];
    return `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedMeals = meals.filter((m) => m.date === selectedDate);
  const upcomingMeals = meals
    .filter((m) => m.date >= today && m.date <= toDateStr(addDays(new Date(), 7)))
    .sort((a, b) => a.date.localeCompare(b.date) || MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type));

  const openAdd = () => { setForm({ ...EMPTY_FORM, date: selectedDate }); setModal("add"); };

  const openAiModal = () => {
    setAiSelected([]);
    setAiRecipes([]);
    setAiError(null);
    setAiStep("select");
    setAiDetailRecipe(null);
    setAiModal(true);
  };

  const toggleAiItem = (id) =>
    setAiSelected((sel) => sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);

  const selectAllAi = () =>
    setAiSelected(aiSelected.length === pantryItems.length ? [] : pantryItems.map((i) => i.id));

  const fetchRecipes = async (isMore = false) => {
    const chosen = pantryItems.filter((i) => aiSelected.includes(i.id));
    if (chosen.length === 0) return;
    isMore ? setAiLoadingMore(true) : setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/meal-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pantryItems: chosen,
          count: 5,
          exclude: aiRecipes.map((r) => r.name),
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setAiRecipes((prev) => [...prev, ...data.recipes].slice(0, 10));
      setAiStep("recipes");
    } catch {
      setAiError("Something went wrong. Please try again.");
    }
    isMore ? setAiLoadingMore(false) : setAiLoading(false);
  };

  const openAiDetail = (recipe) => {
    setAiDetailRecipe(recipe);
    setAiShoppingItems(recipe.missingIngredients?.map((_, i) => i) ?? []);
    setAiStep("detail");
  };

  const toggleShoppingItem = (idx) =>
    setAiShoppingItems((sel) => sel.includes(idx) ? sel.filter((s) => s !== idx) : [...sel, idx]);

  const addToShoppingList = async () => {
    if (!aiDetailRecipe || aiShoppingItems.length === 0) return;
    setAiAddingToCart(true);
    const rows = aiShoppingItems.map((idx) => ({
      user_id: user.id,
      name: aiDetailRecipe.missingIngredients[idx],
      unit: "items",
      category: "Other",
      purchased: false,
    }));
    await supabase.from("mp_shopping").insert(rows);
    setAiAddingToCart(false);
    setAiShoppingItems([]);
    alert(`${rows.length} item${rows.length !== 1 ? "s" : ""} added to your shopping list.`);
  };

  const useRecipe = (recipe) => {
    setForm({ ...EMPTY_FORM, date: selectedDate, name: recipe.name, notes: recipe.description || "" });
    setAiModal(false);
    setAiStep("select");
    setModal("add");
  };
  const openEdit = (meal) => { setForm({ name: meal.name, date: meal.date, meal_type: meal.meal_type || "Dinner", pantry_search: meal.pantry_search || "", additional_ingredients: meal.additional_ingredients || "", recipe_link: meal.recipe_link || "", notes: meal.notes || "" }); setModal(meal.id); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    if (modal === "add") {
      const { data } = await supabase.from("mp_meals").insert({ ...form, user_id: user.id }).select().single();
      if (data) setMeals((prev) => [...prev, data]);
    } else {
      const { data } = await supabase.from("mp_meals").update(form).eq("id", modal).select().single();
      if (data) setMeals((prev) => prev.map((m) => m.id === modal ? data : m));
    }
    setSaving(false);
    setModal(null);
  };

  const handleDelete = async (id) => {
    await supabase.from("mp_meals").delete().eq("id", id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    setModal(null);
  };

  const filteredPantry = pantryItems.filter((p) => form.pantry_search && p.name.toLowerCase().includes(form.pantry_search.toLowerCase()));
  const selectedDayLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 pt-6">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-3">
          <img src="/app-icon.png" alt="POKET" className="w-12 h-12 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold">Meal Planning</h1>
            <p className="text-sm text-gray-500">{monthLabel}</p>
          </div>
        </div>
        <button onClick={goToToday} className="mt-1 px-4 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">Today</button>
      </div>

      <div className="flex bg-white rounded-xl border border-gray-200 p-1 mb-4 mt-4">
        {VIEWS.map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? "bg-white shadow text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <button onClick={navigatePrev} className="p-1 text-gray-400 hover:text-gray-600">‹</button>
          <p className="flex-1 text-center text-sm font-medium text-gray-600">{getPeriodLabel()}</p>
          <button onClick={navigateNext} className="p-1 text-gray-400 hover:text-gray-600">›</button>
        </div>

        {view === "Month" ? (
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="bg-white text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
            {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`e${i}`} className="bg-white" />)}
            {days.map((d) => {
              const ds = toDateStr(d);
              const isToday = ds === today;
              const isSelected = ds === selectedDate;
              const hasMeals = meals.some((m) => m.date === ds);
              return (
                <button key={ds} onClick={() => setSelectedDate(ds)}
                  className={`bg-white flex flex-col items-center py-2 transition-colors ${isSelected ? "bg-green-500 text-white" : isToday ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50"}`}>
                  <span className={`text-xs font-bold ${isSelected ? "text-white" : ""}`}>{d.getDate()}</span>
                  {hasMeals && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-green-400"}`} />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 p-2">
            {days.map((d) => {
              const ds = toDateStr(d);
              const isToday = ds === today;
              const isSelected = ds === selectedDate;
              const hasMeals = meals.some((m) => m.date === ds);
              return (
                <button key={ds} onClick={() => setSelectedDate(ds)}
                  className={`flex flex-col items-center py-2 rounded-xl transition-colors ${isSelected ? "bg-green-500 text-white" : isToday ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}>
                  <span className="text-xs font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="text-sm font-bold">{d.getDate()}</span>
                  {hasMeals && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-green-400"}`} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">{selectedDayLabel}</h2>
          <div className="flex gap-2">
            <button onClick={openAiModal} className="bg-purple-100 text-purple-700 text-xs px-3 py-1.5 rounded-full font-medium hover:bg-purple-200 flex items-center gap-1">
              ✨ AI Ideas
            </button>
            <button onClick={openAdd} className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-green-600 flex items-center gap-1">
              <span>+</span> Add Meal
            </button>
          </div>
        </div>
        {selectedMeals.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">No meals planned</p>
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
        <div className="mb-4">
          <h2 className="font-semibold text-gray-500 mb-2 text-xs uppercase tracking-widest">Upcoming This Week</h2>
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

      {aiModal && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="bg-white rounded-2xl w-full flex flex-col" style={{maxHeight: '85dvh', maxWidth: '28rem'}}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {aiStep !== "select" && (
                  <button onClick={() => setAiStep(aiStep === "detail" ? "recipes" : "select")} className="text-gray-400 hover:text-gray-600 text-lg leading-none mr-1">‹</button>
                )}
                <h2 className="text-lg font-bold">
                  {aiStep === "select" ? "✨ AI Meal Ideas" : aiStep === "recipes" ? "✨ Suggestions" : aiDetailRecipe?.name}
                </h2>
              </div>
              <button onClick={() => setAiModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* Step 1: Pantry item selection */}
            {aiStep === "select" && (
              <>
                <div className="overflow-y-auto flex-1 px-5 py-4">
                  <p className="text-sm text-gray-600 mb-3">Select pantry items to include. Meal Planner AI will suggest 5 meals you can make.</p>
                  <div className="flex gap-2 mb-3">
                    <button onClick={selectAllAi} className="text-xs px-3 py-1 border border-purple-200 text-purple-600 rounded-full hover:bg-purple-50">
                      {aiSelected.length === pantryItems.length ? "Deselect all" : "Select all"}
                    </button>
                    <span className="text-xs text-gray-400 self-center">{aiSelected.length} of {pantryItems.length} selected</span>
                  </div>
                  <ul className="space-y-1.5">
                    {pantryItems.map((item) => (
                      <li key={item.id} onClick={() => toggleAiItem(item.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                          aiSelected.includes(item.id) ? "border-purple-300 bg-purple-50" : "border-gray-100 hover:bg-gray-50"
                        }`}>
                        <input type="checkbox" checked={aiSelected.includes(item.id)} onChange={() => toggleAiItem(item.id)}
                          onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-purple-500 flex-shrink-0" />
                        <span className="text-sm text-gray-800">{item.name}</span>
                        {item.quantity && <span className="text-xs text-gray-400 ml-auto">{item.quantity} {item.unit}</span>}
                      </li>
                    ))}
                  </ul>
                  {aiError && <p className="mt-3 text-sm text-red-500">{aiError}</p>}
                </div>
                <div className="px-5 pt-3 pb-4 border-t border-gray-100" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
                  <button onClick={() => fetchRecipes(false)} disabled={aiSelected.length === 0 || aiLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    {aiLoading ? "Getting ideas..." : `✨ Get Meal Ideas (${aiSelected.length} item${aiSelected.length !== 1 ? "s" : ""})`}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Recipe list */}
            {aiStep === "recipes" && (
              <>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                  <p className="text-sm text-gray-500">Tap a recipe for full details.</p>
                  {aiRecipes.map((recipe, i) => (
                    <div key={i} onClick={() => openAiDetail(recipe)}
                      className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors">
                      <p className="font-semibold text-gray-900 mb-1">{recipe.name}</p>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{recipe.description}</p>
                      {recipe.usedIngredients?.length > 0 && (
                        <p className="text-xs text-green-600 mb-0.5">✓ Have: {recipe.usedIngredients.join(", ")}</p>
                      )}
                      {recipe.missingIngredients?.length > 0 && (
                        <p className="text-xs text-orange-500">Need: {recipe.missingIngredients.join(", ")}</p>
                      )}
                    </div>
                  ))}
                  {aiRecipes.length < 10 && (
                    <button onClick={() => fetchRecipes(true)} disabled={aiLoadingMore}
                      className="w-full text-sm text-purple-600 hover:text-purple-800 py-2 disabled:opacity-40">
                      {aiLoadingMore ? "Getting more ideas..." : "✨ Generate 5 more suggestions"}
                    </button>
                  )}
                  {aiError && <p className="text-sm text-red-500">{aiError}</p>}
                </div>
                <div className="px-5 pt-3 pb-4 border-t border-gray-100" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
                  <button onClick={() => setAiStep("select")} className="w-full py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                    ← Change pantry selection
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Recipe detail */}
            {aiStep === "detail" && aiDetailRecipe && (
              <>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                  <p className="text-sm text-gray-600">{aiDetailRecipe.description}</p>

                  {/* Ingredients */}
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Ingredients</p>
                    <ul className="space-y-1">
                      {aiDetailRecipe.allIngredients?.map((ing, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-gray-400">•</span>
                          <span><span className="font-medium">{ing.name}</span>{ing.amount ? ` — ${ing.amount}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Instructions</p>
                    <ol className="space-y-2">
                      {aiDetailRecipe.instructions?.map((step, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="font-bold text-purple-600 flex-shrink-0">{i + 1}.</span>
                          <span>{step.replace(/^Step \d+:\s*/i, "")}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Special notes */}
                  {aiDetailRecipe.specialNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-amber-700 mb-1">Tips & Notes</p>
                      <p className="text-xs text-amber-800">{aiDetailRecipe.specialNotes}</p>
                    </div>
                  )}

                  {/* Shopping list items */}
                  {aiDetailRecipe.missingIngredients?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Add to Shopping List</p>
                      <p className="text-xs text-gray-500 mb-2">Select items you need to buy:</p>
                      <ul className="space-y-1.5">
                        {aiDetailRecipe.missingIngredients.map((ing, idx) => (
                          <li key={idx} onClick={() => toggleShoppingItem(idx)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                              aiShoppingItems.includes(idx) ? "border-green-300 bg-green-50" : "border-gray-100 hover:bg-gray-50"
                            }`}>
                            <input type="checkbox" checked={aiShoppingItems.includes(idx)} onChange={() => toggleShoppingItem(idx)}
                              onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-800">{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 px-5 pt-3 pb-4 border-t border-gray-100" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
                  {aiDetailRecipe.missingIngredients?.length > 0 && (
                    <button onClick={addToShoppingList} disabled={aiShoppingItems.length === 0 || aiAddingToCart}
                      className="flex-1 py-2.5 rounded-xl text-sm border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-40">
                      {aiAddingToCart ? "Adding..." : `🛒 Add (${aiShoppingItems.length})`}
                    </button>
                  )}
                  <button onClick={() => useRecipe(aiDetailRecipe)}
                    className="flex-1 py-2.5 rounded-xl text-sm bg-green-500 text-white font-medium hover:bg-green-600">
                    Plan This Meal
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="bg-white rounded-2xl w-full flex flex-col" style={{maxHeight: '85dvh', maxWidth: '28rem'}}>
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
              <div className="flex gap-2 px-5 pt-4 pb-4 border-t border-gray-100" style={{paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'}}>
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
