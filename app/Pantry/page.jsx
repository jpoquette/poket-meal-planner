"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useUser } from "../components/AuthProvider";
import { AuthGuard } from "../components/AuthGuard";

const UNITS = ["bags", "bottles", "cans", "cups", "dozen", "fillets", "gallons", "items", "lbs", "liters", "oz", "packages"];
const CATEGORIES = ["Beverages", "Canned Goods", "Condiments", "Dairy", "Deli", "Frozen", "Grains & Bread", "Meat & Seafood", "Other", "Produce", "Snacks", "Spices"];
const EMPTY_FORM = { name: "", quantity: "", unit: "packages", category: "Other", date_acquired: "", expiration_date: "", notes: "" };

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + "T00:00:00");
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function PantryContent() {
  const user = useUser();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickAdd, setQuickAdd] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expiryWindow, setExpiryWindow] = useState(7);

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

  const expiringItems = items.filter((item) => {
    const days = daysUntilExpiry(item.expiration_date);
    return days !== null && days <= expiryWindow;
  });

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    const { data: found } = await supabase.from("mp_pantry").select("*").eq("user_id", user.id).ilike("name", quickAdd.trim()).maybeSingle();
    if (found) {
      const { data } = await supabase.from("mp_pantry").update({ quantity: (found.quantity || 0) + 1 }).eq("id", found.id).select().single();
      if (data) setItems((prev) => prev.map((i) => i.id === found.id ? data : i));
    } else {
      const { data } = await supabase.from("mp_pantry").insert({ user_id: user.id, name: quickAdd.trim(), quantity: 1, unit: "items", category: "Other" }).select().single();
      if (data) setItems((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setQuickAdd("");
  };

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
      const { data: found } = await supabase.from("mp_pantry").select("*").eq("user_id", user.id).ilike("name", form.name.trim()).maybeSingle();
      if (found) {
        const newQty = (found.quantity || 0) + (Number(form.quantity) || 1);
        const { data } = await supabase.from("mp_pantry").update({ ...payload, quantity: newQty }).eq("id", found.id).select().single();
        if (data) setItems((prev) => prev.map((i) => i.id === found.id ? data : i).sort((a, b) => a.name.localeCompare(b.name)));
        setSaving(false);
        setModal(null);
        return;
      }
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
        <div>
          <h1 className="text-2xl font-bold">Pantry</h1>
          <p className="text-sm text-gray-500">Track what you have at home</p>
        </div>
      </div>

      {/* Expiring soon banner */}
      {expiringItems.length > 0 && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-orange-700">
              🕐 {expiringItems.length} item{expiringItems.length !== 1 ? "s" : ""} expiring within {expiryWindow} days
            </p>
            <button
              onClick={() => router.push(`/Meals?expiring=${expiryWindow}`)}
              className="text-xs px-3 py-1 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600">
              ✨ Get Meal Ideas
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-orange-600">Window:</span>
            {[3, 7, 14].map((d) => (
              <button key={d} onClick={() => setExpiryWindow(d)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${expiryWindow === d ? "bg-orange-500 text-white border-orange-500" : "border-orange-300 text-orange-600 hover:bg-orange-100"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
          placeholder="Search pantry…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
        <input
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
          placeholder="Quick add an item…"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 shadow-sm">Add</button>
      </form>

      {/* Category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {["All", ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setCategoryFilter(cat)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              categoryFilter === cat
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <ul className="space-y-2 mb-4">
        {filtered.map((item) => {
          const days = daysUntilExpiry(item.expiration_date);
          const isExpired = days !== null && days <= 0;
          const isExpiringSoon = days !== null && days > 0 && days <= expiryWindow;
          return (
            <li key={item.id} onClick={() => openEdit(item)}
              className={`bg-white rounded-xl p-3 flex items-center justify-between border shadow-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors ${isExpired ? "border-red-200" : isExpiringSoon ? "border-orange-200" : "border-gray-100"}`}>
              <div>
                <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {item.quantity ? `${item.quantity} ${item.unit}` : ""}
                  {item.category && item.category !== "Other" ? ` · ${item.category}` : ""}
                </p>
                {days !== null && (
                  <p className={`text-xs mt-0.5 font-medium ${isExpired ? "text-red-500" : isExpiringSoon ? "text-orange-500" : "text-gray-400"}`}>
                    {isExpired ? `Expired ${Math.abs(days)}d ago` : days === 0 ? "Expires today" : `Expires in ${days}d`}
                  </p>
                )}
              </div>
              <span className="text-gray-400 text-lg">›</span>
            </li>
          );
        })}
      </ul>

      <button onClick={openAdd} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors">
        + Add with details
      </button>

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
