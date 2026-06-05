"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

const UNITS = ["bags", "bottles", "cans", "cups", "dozen", "fillets", "gallons", "items", "lbs", "liters", "oz", "packages"];
const CATEGORIES = ["Beverages", "Canned Goods", "Condiments", "Dairy", "Deli", "Frozen", "Grains & Bread", "Meat & Seafood", "Other", "Produce", "Snacks", "Spices"];
const STORES = ["Aldis", "CostCo", "Festival", "Other", "Pick N Save", "Piggly Wiggle", "Wagners"];
const EMPTY_FORM = { name: "", quantity: "", unit: "items", category: "Other", store: "", notes: "" };

function ShoppingContent() {
  const user = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedPurchased, setSelectedPurchased] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase.from("shopping").select("*").eq("user_id", user.id).order("name");
    setItems(data || []);
    setLoading(false);
  }

  const unpurchased = items.filter((i) => !i.purchased && i.name.toLowerCase().includes(search.toLowerCase()));
  const purchased = items.filter((i) => i.purchased && i.name.toLowerCase().includes(search.toLowerCase()));

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    const { data } = await supabase.from("shopping").insert({ user_id: user.id, name: quickAdd.trim(), unit: "items", category: "Other", purchased: false }).select().single();
    if (data) setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setQuickAdd("");
  };

  const togglePurchased = async (id) => {
    const item = items.find((i) => i.id === id);
    const { data } = await supabase.from("shopping").update({ purchased: !item.purchased }).eq("id", id).select().single();
    if (data) setItems((prev) => prev.map((i) => i.id === id ? data : i));
    setSelectedPurchased((sel) => sel.filter((s) => s !== id));
  };

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (item) => {
    setForm({ name: item.name, quantity: item.quantity ?? "", unit: item.unit || "items", category: item.category || "Other", store: item.store || "", notes: item.notes || "" });
    setModal(item.id);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, quantity: form.quantity === "" ? null : Number(form.quantity) };
    if (modal === "add") {
      const { data } = await supabase.from("shopping").insert({ ...payload, user_id: user.id, purchased: false }).select().single();
      if (data) setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      const { data } = await supabase.from("shopping").update(payload).eq("id", modal).select().single();
      if (data) setItems((prev) => prev.map((i) => i.id === modal ? data : i).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setSaving(false);
    setModal(null);
  };

  const handleDelete = async (id) => {
    await supabase.from("shopping").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setModal(null);
  };

  const toggleSelectPurchased = (id) => setSelectedPurchased((sel) => sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);
  const selectAllPurchased = () => setSelectedPurchased(selectedPurchased.length === purchased.length ? [] : purchased.map((i) => i.id));

  const moveToPantry = async () => {
    const toMove = items.filter((i) => selectedPurchased.includes(i.id));
    const pantryRows = toMove.map((i) => ({ user_id: user.id, name: i.name, quantity: i.quantity || 1, unit: i.unit || "items", category: i.category || "Other", date_acquired: new Date().toISOString().split("T")[0] }));
    await Promise.all([
      supabase.from("pantry").insert(pantryRows),
      supabase.from("shopping").delete().in("id", selectedPurchased),
    ]);
    setItems((prev) => prev.filter((i) => !selectedPurchased.includes(i.id)));
    setSelectedPurchased([]);
  };

  const clearPurchased = async () => {
    await supabase.from("shopping").delete().in("id", selectedPurchased);
    setItems((prev) => prev.filter((i) => !selectedPurchased.includes(i.id)));
    setSelectedPurchased([]);
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Shopping List</h1>
      <p className="text-sm text-gray-500 mb-4">{items.length} items · {purchased.length} purchased</p>

      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
        <input className={inputCls + " flex-1"} placeholder="Add to shopping list..." value={quickAdd} onChange={(e) => setQuickAdd(e.target.value)} />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600">Add</button>
      </form>

      <input className={inputCls + " w-full mb-4"} placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <ul className="space-y-2 mb-4">
        {unpurchased.map((item) => <ShoppingItem key={item.id} item={item} onToggle={togglePurchased} onEdit={openEdit} />)}
      </ul>

      {purchased.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-500 mb-2">Purchased ({purchased.length})</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={selectAllPurchased} className="text-xs px-3 py-1 border border-gray-200 rounded-full hover:bg-gray-50">
              {selectedPurchased.length === purchased.length ? "Deselect all" : "Select all"}
            </button>
            <button onClick={moveToPantry} disabled={selectedPurchased.length === 0} className="text-xs px-3 py-1 border border-green-200 text-green-600 rounded-full hover:bg-green-50 disabled:opacity-40">
              Move to Pantry ({selectedPurchased.length})
            </button>
            <button onClick={clearPurchased} disabled={selectedPurchased.length === 0} className="text-xs px-3 py-1 border border-red-200 text-red-500 rounded-full hover:bg-red-50 disabled:opacity-40">
              Clear ({selectedPurchased.length})
            </button>
          </div>
          <ul className="space-y-2">
            {purchased.map((item) => <ShoppingItem key={item.id} item={item} onToggle={togglePurchased} onEdit={openEdit} selectable selected={selectedPurchased.includes(item.id)} onSelect={toggleSelectPurchased} />)}
          </ul>
        </div>
      )}

      <button onClick={openAdd} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors">
        + Add with details
      </button>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col" style={{maxHeight: '90vh'}}>
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
                <Field label="Store">
                  <select className={inputCls} value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })}>
                    <option value="">Select store</option>
                    {STORES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
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

export default function ShoppingPage() {
  return <AuthGuard><ShoppingContent /></AuthGuard>;
}

function ShoppingItem({ item, onToggle, onEdit, selectable, selected, onSelect }) {
  return (
    <li className={`bg-white rounded-xl p-3 flex items-center gap-3 border shadow-sm ${item.purchased ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
      {selectable && <input type="checkbox" checked={selected} onChange={() => onSelect(item.id)} className="w-4 h-4 accent-green-500" />}
      <button onClick={() => onToggle(item.id)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.purchased ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
        {item.purchased && <span className="text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(item)}>
        <p className={`font-semibold text-sm ${item.purchased ? "line-through text-gray-400" : "text-gray-900"}`}>{item.name}</p>
        <p className="text-xs text-gray-600 mt-0.5">{item.quantity ? `${item.quantity} ${item.unit} · ` : ""}{item.category}{item.store ? ` · ${item.store}` : ""}</p>
      </div>
      <span className="text-gray-400 text-lg">›</span>
    </li>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>{children}</div>;
}

const inputCls = "border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
