"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

const EMPTY_FORM = {
  title: "", description: "", image_url: "",
  ingredients: "", instructions: "",
  servings: "", prep_hours: "", prep_minutes: "",
  cook_hours: "", cook_minutes: "", notes: "",
};

function formatTime(h, m) {
  const hours = parseInt(h) || 0;
  const mins = parseInt(m) || 0;
  if (!hours && !mins) return null;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function RecipesContent() {
  const user = useUser();
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formMode, setFormMode] = useState("add");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pantryModal, setPantryModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planSuccess, setPlanSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("mp_recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("mp_pantry").select("id, name").eq("user_id", user.id),
    ]).then(([{ data: r }, { data: p }]) => {
      setRecipes(r || []);
      setPantryItems(p || []);
      setLoading(false);
    });
  }, [user]);

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setImportUrl("");
    setImportError(null);
    setFormMode("add");
    setView("form");
  };

  const openEdit = (recipe) => {
    setForm({
      title: recipe.title || "",
      description: recipe.description || "",
      image_url: recipe.image_url || "",
      ingredients: recipe.ingredients || "",
      instructions: recipe.instructions || "",
      servings: recipe.servings || "",
      prep_hours: recipe.prep_hours ?? "",
      prep_minutes: recipe.prep_minutes ?? "",
      cook_hours: recipe.cook_hours ?? "",
      cook_minutes: recipe.cook_minutes ?? "",
      notes: recipe.notes || "",
    });
    setFormMode("edit");
    setView("form");
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/recipe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Import failed");
      setForm({
        title: data.recipe.title || "",
        description: data.recipe.description || "",
        image_url: data.recipe.image_url || "",
        ingredients: data.recipe.ingredients || "",
        instructions: data.recipe.instructions || "",
        servings: String(data.recipe.servings || ""),
        prep_hours: data.recipe.prep_hours ?? "",
        prep_minutes: data.recipe.prep_minutes ?? "",
        cook_hours: data.recipe.cook_hours ?? "",
        cook_minutes: data.recipe.cook_minutes ?? "",
        notes: data.recipe.notes || "",
      });
    } catch (err) {
      setImportError(err.message || "Could not import. Try a different URL.");
    }
    setImporting(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      prep_hours: parseInt(form.prep_hours) || 0,
      prep_minutes: parseInt(form.prep_minutes) || 0,
      cook_hours: parseInt(form.cook_hours) || 0,
      cook_minutes: parseInt(form.cook_minutes) || 0,
    };
    if (formMode === "add") {
      const { data } = await supabase.from("mp_recipes").insert({ ...payload, user_id: user.id }).select().single();
      if (data) { setRecipes((prev) => [data, ...prev]); setSelectedRecipe(data); }
    } else {
      const { data } = await supabase.from("mp_recipes").update(payload).eq("id", selectedRecipe.id).select().single();
      if (data) { setRecipes((prev) => prev.map((r) => r.id === selectedRecipe.id ? data : r)); setSelectedRecipe(data); }
    }
    setSaving(false);
    setView("detail");
  };

  const handleDelete = async () => {
    await supabase.from("mp_recipes").delete().eq("id", selectedRecipe.id);
    setRecipes((prev) => prev.filter((r) => r.id !== selectedRecipe.id));
    setDeleteConfirm(false);
    setSelectedRecipe(null);
    setView("list");
  };

  const handlePlanMeal = async () => {
    setPlanning(true);
    await supabase.from("mp_meals").insert({
      user_id: user.id,
      name: selectedRecipe.title,
      date: new Date().toISOString().split("T")[0],
      meal_type: "Dinner",
      additional_ingredients: selectedRecipe.ingredients || "",
      notes: selectedRecipe.instructions || "",
      recipe_link: "",
      pantry_search: "",
    });
    setPlanning(false);
    setPlanSuccess(true);
    setTimeout(() => { setPlanSuccess(false); router.push("/Meals"); }, 1500);
  };

  const getPantryMatches = () => {
    if (!selectedRecipe?.ingredients) return { have: [], missing: [] };
    const lines = selectedRecipe.ingredients.split("\n").map((l) => l.trim()).filter(Boolean);
    const pantryNames = pantryItems.map((p) => p.name.toLowerCase());
    const have = [], missing = [];
    lines.forEach((line) => {
      const words = line.toLowerCase().replace(/^[\d\s\/.½¼¾⅓⅔]+/, "").split(/\s+/).filter(Boolean);
      const matched = pantryNames.some((pn) =>
        words.some((w) => w.length > 2 && (pn.includes(w) || w.includes(pn)))
      );
      matched ? have.push(line) : missing.push(line);
    });
    return { have, missing };
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (view === "detail" && selectedRecipe) {
    const prepTime = formatTime(selectedRecipe.prep_hours, selectedRecipe.prep_minutes);
    const cookTime = formatTime(selectedRecipe.cook_hours, selectedRecipe.cook_minutes);
    const ingredientLines = (selectedRecipe.ingredients || "").split("\n").filter(Boolean);
    const instructionLines = (selectedRecipe.instructions || "").split("\n").filter(Boolean);

    return (
      <div className="pb-28">
        <div className="flex items-center justify-between px-4 pt-6 pb-3">
          <button onClick={() => setView("list")} className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1">
            ‹ Recipes
          </button>
          <div className="flex gap-2">
            <button onClick={() => openEdit(selectedRecipe)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50">Edit</button>
            <button onClick={() => setDeleteConfirm(true)} className="text-xs px-3 py-1.5 border border-red-200 rounded-full text-red-500 hover:bg-red-50">Delete</button>
          </div>
        </div>

        {selectedRecipe.image_url ? (
          <div className="px-4 mb-4">
            <img src={selectedRecipe.image_url} alt={selectedRecipe.title} className="w-full h-52 object-cover rounded-2xl" />
          </div>
        ) : (
          <div className="mx-4 mb-4 h-36 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl flex items-center justify-center">
            <span className="text-5xl">🍽️</span>
          </div>
        )}

        <div className="px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{selectedRecipe.title}</h1>
          {selectedRecipe.description && <p className="text-sm text-gray-600 mb-4">{selectedRecipe.description}</p>}

          <div className="flex gap-2 mb-4 flex-wrap">
            {prepTime && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-xs text-gray-400">Prep</p>
                <p className="text-sm font-semibold text-gray-800">{prepTime}</p>
              </div>
            )}
            {cookTime && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-xs text-gray-400">Cook</p>
                <p className="text-sm font-semibold text-gray-800">{cookTime}</p>
              </div>
            )}
            {selectedRecipe.servings && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 text-center min-w-[64px]">
                <p className="text-xs text-gray-400">Serves</p>
                <p className="text-sm font-semibold text-gray-800">{selectedRecipe.servings}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-5">
            <button onClick={handlePlanMeal} disabled={planning || planSuccess}
              className="flex-1 py-2.5 rounded-xl text-sm bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-60">
              {planSuccess ? "✓ Added to Meals!" : planning ? "Adding..." : "📅 Plan This Meal"}
            </button>
            <button onClick={() => setPantryModal(true)}
              className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">
              🥫 Check Pantry
            </button>
          </div>

          {ingredientLines.length > 0 && (
            <div className="mb-5">
              <h2 className="font-bold text-gray-900 mb-3">Ingredients</h2>
              <ul className="space-y-2">
                {ingredientLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 flex-shrink-0 mt-0.5">•</span>{line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {instructionLines.length > 0 && (
            <div className="mb-5">
              <h2 className="font-bold text-gray-900 mb-3">Instructions</h2>
              <ol className="space-y-3">
                {instructionLines.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step.replace(/^(Step\s*)?\d+[.:]\s*/i, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {selectedRecipe.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <h2 className="font-bold text-amber-800 mb-2 text-sm">Notes</h2>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{selectedRecipe.notes}</p>
            </div>
          )}
        </div>

        {pantryModal && (() => {
          const { have, missing } = getPantryMatches();
          return (
            <div className="fixed inset-0 bg-black/40 z-[300] flex items-end sm:items-center justify-center px-4 pb-4">
              <div className="bg-white rounded-2xl w-full flex flex-col" style={{ maxHeight: "80dvh", maxWidth: "28rem" }}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                  <h2 className="text-lg font-bold">🥫 Pantry Check</h2>
                  <button onClick={() => setPantryModal(false)} className="text-gray-400 text-xl">✕</button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                  {have.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">✓ In your pantry ({have.length})</p>
                      <ul className="space-y-1.5">
                        {have.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-green-500 flex-shrink-0">•</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {missing.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">✗ Need to buy ({missing.length})</p>
                      <ul className="space-y-1.5">
                        {missing.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-orange-400 flex-shrink-0">•</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {have.length === 0 && missing.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No ingredients listed for this recipe.</p>
                  )}
                </div>
                <div className="px-5 pb-4 pt-3 border-t border-gray-100" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                  <button onClick={() => setPantryModal(false)} className="w-full py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/40 z-[300] flex items-end sm:items-center justify-center px-4 pb-4">
            <div className="bg-white rounded-2xl w-full" style={{ maxWidth: "28rem" }}>
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h2 className="text-lg font-bold">Delete Recipe?</h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <span className="font-semibold">{selectedRecipe.title}</span>? This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 px-5 pb-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm bg-red-500 text-white font-medium hover:bg-red-600">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── FORM VIEW ────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <div className="px-4 pt-6 pb-28">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => formMode === "edit" ? setView("detail") : setView("list")}
            className="text-gray-500 text-sm">‹ Back</button>
          <h1 className="text-xl font-bold">{formMode === "add" ? "Add Recipe" : "Edit Recipe"}</h1>
        </div>

        {formMode === "add" && (
          <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-purple-700 mb-2">✨ Import from URL</p>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white placeholder-gray-400"
                placeholder="Paste a recipe website URL..."
                value={importUrl}
                onChange={(e) => { setImportUrl(e.target.value); setImportError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
              <button onClick={handleImport} disabled={importing || !importUrl.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-xl font-medium hover:bg-purple-700 disabled:opacity-40 whitespace-nowrap">
                {importing ? "..." : "Import"}
              </button>
            </div>
            {importError && <p className="text-xs text-red-500 mt-1.5">{importError}</p>}
            {!importError && <p className="text-xs text-purple-500 mt-1.5">Fields will be pre-filled from the page — review and save.</p>}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Title *">
            <input className={inputCls} placeholder="e.g., Spaghetti Carbonara" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>

          <Field label="Image URL (optional)">
            <input className={inputCls} type="url" placeholder="https://..." value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            {form.image_url && (
              <img src={form.image_url} alt="" className="mt-2 w-full h-32 object-cover rounded-xl"
                onError={(e) => { e.target.style.display = "none"; }} />
            )}
          </Field>

          <Field label="Description">
            <textarea className={inputCls} placeholder="A brief description of this recipe..." rows={3}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          <Field label="Ingredients" hint="One per line — include quantity and unit">
            <textarea className={inputCls} placeholder={"2 cups flour\n1 tsp salt\n3 large eggs"} rows={7}
              value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} />
          </Field>

          <Field label="Instructions" hint="One step per line">
            <textarea className={inputCls} placeholder={"Preheat oven to 350°F\nMix dry ingredients together\nBake for 30 minutes"} rows={7}
              value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </Field>

          <Field label="Servings">
            <input className={inputCls} placeholder="e.g., 4 or 4-6" value={form.servings}
              onChange={(e) => setForm({ ...form, servings: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prep Time">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input className={inputCls} type="number" min="0" placeholder="hrs" value={form.prep_hours}
                    onChange={(e) => setForm({ ...form, prep_hours: e.target.value })} />
                </div>
                <div className="flex-1">
                  <input className={inputCls} type="number" min="0" max="59" placeholder="min" value={form.prep_minutes}
                    onChange={(e) => setForm({ ...form, prep_minutes: e.target.value })} />
                </div>
              </div>
            </Field>
            <Field label="Cook Time">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input className={inputCls} type="number" min="0" placeholder="hrs" value={form.cook_hours}
                    onChange={(e) => setForm({ ...form, cook_hours: e.target.value })} />
                </div>
                <div className="flex-1">
                  <input className={inputCls} type="number" min="0" max="59" placeholder="min" value={form.cook_minutes}
                    onChange={(e) => setForm({ ...form, cook_minutes: e.target.value })} />
                </div>
              </div>
            </Field>
          </div>

          <Field label="Notes">
            <textarea className={inputCls} placeholder="Tips, variations, substitutions..." rows={3}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => formMode === "edit" ? setView("detail") : setView("list")}
              className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50">
              {saving ? "Saving..." : "Save Recipe"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-28">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src="/app-icon.png" alt="POKET" className="w-12 h-12 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-2xl font-bold">Recipes</h1>
            <p className="text-sm text-gray-500">{recipes.length} saved</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="mt-1 bg-green-500 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-green-600 flex items-center gap-1">
          <span>+</span> Add
        </button>
      </div>

      <input
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white placeholder-gray-400"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📖</span>
          </div>
          <p className="font-semibold text-gray-700 mb-1">{search ? "No recipes found" : "No recipes yet"}</p>
          <p className="text-sm text-gray-400 mb-5">{search ? "Try a different search" : "Add your first recipe manually or import from a URL"}</p>
          {!search && (
            <button onClick={openAdd} className="bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-600">
              + Add Recipe
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((recipe) => {
            const th = (parseInt(recipe.prep_hours) || 0) + (parseInt(recipe.cook_hours) || 0);
            const tm = (parseInt(recipe.prep_minutes) || 0) + (parseInt(recipe.cook_minutes) || 0);
            const totalTime = formatTime(th + Math.floor(tm / 60), tm % 60);
            return (
              <div key={recipe.id}
                onClick={() => { setSelectedRecipe(recipe); setView("detail"); }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-green-200 active:bg-gray-50 transition-colors">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.title} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="font-semibold text-sm text-gray-900 leading-tight line-clamp-2">{recipe.title}</p>
                  {totalTime && <p className="text-xs text-gray-400 mt-1">⏱ {totalTime}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  return <AuthGuard><RecipesContent /></AuthGuard>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
