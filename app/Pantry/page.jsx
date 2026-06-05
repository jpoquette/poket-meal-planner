"use client";
import { useState } from "react";
import { useLocalStorage } from "../../lib/useLocalStorage";

const UNITS = ["bags", "bottles", "cans", "cups", "dozen", "fillets", "gallons", "items", "lbs", "liters", "oz", "packages"];
const CATEGORIES = ["Beverages", "Canned Goods", "Condiments", "Dairy", "Deli", "Frozen", "Grains & Bread", "Meat & Seafood", "Other", "Produce", "Snacks", "Spices"];

const EMPTY_FORM = { name: "", quantity: "", unit: "packages", category: "Other", dateAcquired: "", expirationDate: "", notes: "" };

export default function PantryPage() {
  const [items, setItems, loaded] = useLocalStorage("pantry", []);
  const [quickAdd, setQuickAdd] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modal, setModal] = useState(null); // null | "add" | item (for edit)
  const [form, setForm] = useState(EMPTY_FORM);

  if (!loaded) return null;

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    const newItem = { ...EMPTY_FORM, id: crypto.randomUUID(), name: quickAdd.trim(), quantity: 1 };
    setItems([...items, newItem]);
    setQuickAdd("");
  };

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (item) => { setForm({ ...item }); setModal(item.id); };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (modal === "add") {
      setItems([...items, { ...form, id: crypto.randomUUID() }]);
    } else {
      setItems(items.map((i) => (i.id === modal ? { ...form, id: modal } : i)));
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    setItems(items.filter((i) => i.id !== id));
    setModal(null);
  };

  const allCategories = ["All", ...CATEGORIES];

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Pantry</h1>
      <p className="text-sm text-gray-500 mb-4">Track what you have at home</p>

      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          placeholder="Quick add an item..."
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600">Add</button>
      </form>

      <input
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              categoryFilter === cat
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <ul className="space-y-2 mb-4">
        {filtered.map((item) => (
          <li key={item.id} className="bg-white rounded-xl p-3 flex items-center justify-between border border-gray-100 shadow-sm">
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-gray-400">
                {item.quantity ? `${item.quantity} ${item.unit}` : ""}
                {item.category && item.category !== "Other" ? ` · ${item.category}` : ""}
              </p>
            </div>
            <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-gray-600 p-1">
              <PencilIcon />
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={openAdd}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors"
      >
        + Add with details
      </button>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{modal === "add" ? "Add Item" : "Edit Item"}</h2>
                <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <Field label="Name">
                  <input className={inputCls} placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantity">
                    <input className={inputCls} type="number" min="0" placeholder="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </Field>
                  <Field label="Unit">
                    <select className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Category">
                  <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date Acquired">
                    <input className={inputCls} type="date" value={form.dateAcquired} onChange={(e) => setForm({ ...form, dateAcquired: e.target.value })} />
                  </Field>
                  <Field label="Expiration Date">
                    <input className={inputCls} type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
                  </Field>
                </div>
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

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
