"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

const UNITS = ["bags", "bottles", "cans", "cups", "dozen", "fillets", "gallons", "items", "lbs", "liters", "oz", "packages"];
const CATEGORIES = ["Beverages", "Canned Goods", "Condiments", "Dairy", "Deli", "Frozen", "Grains & Bread", "Meat & Seafood", "Other", "Produce", "Snacks", "Spices"];
const EMPTY_FORM = { name: "", quantity: "", unit: "packages", category: "Other", date_acquired: "", expiration_date: "", notes: "" };

function PantryContent() {
  const user = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [selectedForAI, setSelectedForAI] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase.from("mp_pantry").select("*").eq("user_id", user.id).order("name");
    setItems(data || []);
    setLoading(false);
  }

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    const { data } = await supabase.from("mp_pantry").insert({ user_id: user.id, name: quickAdd.trim(), quantity: 1, unit: "items", category: "Other" }).select().single();
    if (data) setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setQuickAdd("");
  };

  const toggleAiMode = () => {
    setAiMode((on) => !on);
    setSelectedForAI([]);
  };

  const toggleSelectForAI = (id) =>
    setSelectedForAI((sel) => sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);

  const selectAllForAI = () =>
    setSelectedForAI(selectedForAI.length === filtered.length ? [] : filtered.map((i) => i.id));

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (item) => {
    setForm({ name: item.name, quantity: item.quantity ?? "", unit: item.unit || "packages", category: item.category || "Other", date_acquired: item.date_acquired || "", expiration_date: item.expiration_date || "", notes: item.notes || "" });
    setModal(item.id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, quantity: form.quantity === "" ? null : Number(form.quantity), date_acquired: form.date_acquired || null, expiration_date: form.expiration_date || null };
    if (modal === "add") {
      const { data } = await supabase.from("mp_pantry").insert({ ...payload, user_id: user.id }).select().single();
      if (data) setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      const { data } = await supabase.from("mp_pantry").update(payload).eq("id", modal).select().single();
      if (data) setItems((prev) => prev.map((i) => i.id === modal ? data : i).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setSaving(false);
    setModal(null);
  };

  const handleDelete = async (id) => {
    await supabase.from("mp_pantry").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setModal(null);
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-4">
        <img src="/app-icon.png" alt="POKET" className="w-12 h-12 rounded-xl shadow-sm" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pantry</h1>
          <p className="text-sm text-gray-500">Track what you have at home</p>
        </div>
        <button
          onClick={toggleAiMode}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
            aiMode
              ? "bg-purple-100 border-purple-300 text-purple-700"
              : "bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600"
          }`}
        >
          <span>✨</span>
          {aiMode ? "Cancel" : "AI Meals"}
        </button>
      </div>

      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
        <input className={inputCls + " flex-1"} placeholder="Quick add an item..." value={quickAdd} onChange={(e) => setQuickAdd(e.target.value)} />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600">Add</button>
      </form>

      <input className={inputCls + " w-full mb-3"} placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        <select
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="All">All</option>
          {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {aiMode && (
        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-xs text-purple-700 font-medium mb-2">Select items to send to AI for meal recommendations</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={selectAllForAI} className="text-xs px-3 py-1 border border-purple-200 text-purple-600 rounded-full hover:bg-purple-100">
              {selectedForAI.length === filtered.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-purple-500 self-center">{selectedForAI.length} selected</span>
          </div>
        </div>
      )}

      <ul className="space-y-2 mb-4">
        {filtered.map((item) => (
          <li key={item.id}
            onClick={() => aiMode ? toggleSelectForAI(item.id) : openEdit(item)}
            className={`bg-white rounded-xl p-3 flex items-center gap-3 border shadow-sm cursor-pointer transition-colors ${
              aiMode && selectedForAI.includes(item.id)
                ? "border-purple-300 bg-purple-50"
                : "border-gray-100 hover:bg-gray-50 active:bg-gray-100"
            }`}>
            {aiMode && (
              <input
                type="checkbox"
                checked={selectedForAI.includes(item.id)}
                onChange={() => toggleSelectForAI(item.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 accent-purple-500 flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {item.quantity ? `${item.quantity} ${item.unit}` : ""}
                {item.category && item.category !== "Other" ? ` · ${item.category}` : ""}
              </p>
            </div>
            {!aiMode && <span className="text-gray-400 text-lg">›</span>}
          </li>
        ))}
      </ul>

      {aiMode ? (
        <button
          disabled={selectedForAI.length === 0}
          className="w-full py-3 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ✨ Get Meal Ideas ({selectedForAI.length} item{selectedForAI.length !== 1 ? "s" : ""})
        </button>
      ) : (
        <button onClick={openAdd} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors">
          + Add with details
        </button>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-end sm:items-center justify-center px-4 pb-4">
          <div className="bg-white rounded-2xl w-full flex flex-col" style={{maxHeight: '85dvh', maxWidth: '28rem'}}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold">{modal === "add" ? "Add Item" : "Edit Item"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                <Field label="Name"><input className={inputCls} placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantity"><input className={inputCls} type="number" min="0" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
                  <Field label="Unit"><select className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
                </div>
                <Field label="Category"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date Acquired"><input className={inputCls} type="date" value={form.date_acquired} onChange={(e) => setForm({ ...form, date_acquired: e.target.value })} /></Field>
                  <Field label="Expiration Date"><input className={inputCls} type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} /></Field>
                </div>
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

export default function PantryPage() {
  return <AuthGuard><PantryContent /></AuthGuard>;
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>{children}</div>;
}

const inputCls = "border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
