"use client";
import { useState } from "react";
import { useLocalStorage } from "../../lib/useLocalStorage";

const UNITS = ["bags", "bottles", "cans", "cups", "dozen", "fillets", "gallons", "items", "lbs", "liters", "oz", "packages"];
const CATEGORIES = ["Beverages", "Canned Goods", "Condiments", "Dairy", "Deli", "Frozen", "Grains & Bread", "Meat & Seafood", "Other", "Produce", "Snacks", "Spices"];
const EMPTY_FORM = { name: "", quantity: "", unit: "items", category: "Other", notes: "" };

export default function ShoppingPage() {
  const [items, setItems, loaded] = useLocalStorage("shopping", []);
  const [pantryItems, setPantryItems] = useLocalStorage("pantry", []);
  const [quickAdd, setQuickAdd] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedPurchased, setSelectedPurchased] = useState([]);

  if (!loaded) return null;

  const unpurchased = items.filter((i) => !i.purchased && i.name.toLowerCase().includes(search.toLowerCase()));
  const purchased = items.filter((i) => i.purchased && i.name.toLowerCase().includes(search.toLowerCase()));

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    setItems([...items, { ...EMPTY_FORM, id: crypto.randomUUID(), name: quickAdd.trim(), purchased: false }]);
    setQuickAdd("");
  };

  const togglePurchased = (id) => {
    setItems(items.map((i) => (i.id === id ? { ...i, purchased: !i.purchased } : i)));
    setSelectedPurchased((sel) => sel.filter((s) => s !== id));
  };

  const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
  const openEdit = (item) => { setForm({ ...item }); setModal(item.id); };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (modal === "add") {
      setItems([...items, { ...form, id: crypto.randomUUID(), purchased: false }]);
    } else {
      setItems(items.map((i) => (i.id === modal ? { ...form, id: modal } : i)));
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    setItems(items.filter((i) => i.id !== id));
    setModal(null);
  };

  const toggleSelectPurchased = (id) => {
    setSelectedPurchased((sel) => sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]);
  };

  const selectAllPurchased = () => {
    if (selectedPurchased.length === purchased.length) {
      setSelectedPurchased([]);
    } else {
      setSelectedPurchased(purchased.map((i) => i.id));
    }
  };

  const moveToPantry = () => {
    const toMove = items.filter((i) => selectedPurchased.includes(i.id));
    const newPantryItems = toMove.map((i) => ({
      id: crypto.randomUUID(),
      name: i.name,
      quantity: i.quantity || 1,
      unit: i.unit || "items",
      category: i.category || "Other",
      dateAcquired: new Date().toISOString().split("T")[0],
      expirationDate: "",
      notes: i.notes || "",
    }));
    setPantryItems([...pantryItems, ...newPantryItems]);
    setItems(items.filter((i) => !selectedPurchased.includes(i.id)));
    setSelectedPurchased([]);
  };

  const clearPurchased = () => {
    setItems(items.filter((i) => !selectedPurchased.includes(i.id)));
    setSelectedPurchased([]);
  };

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Shopping List</h1>
      <p className="text-sm text-gray-500 mb-4">
        {items.length} items · {purchased.length} purchased
      </p>

      <form onSubmit={handleQuickAdd} className="flex gap-2 mb-3">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
          placeholder="Add to shopping list..."
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600">Add</button>
      </form>

      <input
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="space-y-2 mb-4">
        {unpurchased.map((item) => (
          <ShoppingItem key={item.id} item={item} onToggle={togglePurchased} onEdit={openEdit} />
        ))}
      </ul>

      {purchased.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-500">Purchased ({purchased.length})</p>
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={selectAllPurchased} className="text-xs px-3 py-1 border border-gray-200 rounded-full hover:bg-gray-50">
              {selectedPurchased.length === purchased.length ? "Deselect all" : "Select all"}
            </button>
            <button
              onClick={moveToPantry}
              disabled={selectedPurchased.length === 0}
              className="text-xs px-3 py-1 border border-green-200 text-green-600 rounded-full hover:bg-green-50 disabled:opacity-40"
            >
              Move to Pantry ({selectedPurchased.length})
            </button>
            <button
              onClick={clearPurchased}
              disabled={selectedPurchased.length === 0}
              className="text-xs px-3 py-1 border border-red-200 text-red-500 rounded-full hover:bg-red-50 disabled:opacity-40"
            >
              Clear ({selectedPurchased.length})
            </button>
          </div>
          <ul className="space-y-2">
            {purchased.map((item) => (
              <ShoppingItem
                key={item.id}
                item={item}
                onToggle={togglePurchased}
                onEdit={openEdit}
                selectable
                selected={selectedPurchased.includes(item.id)}
                onSelect={toggleSelectPurchased}
              />
            ))}
          </ul>
        </div>
      )}

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

function ShoppingItem({ item, onToggle, onEdit, selectable, selected, onSelect }) {
  return (
    <li className={`bg-white rounded-xl p-3 flex items-center gap-3 border shadow-sm ${item.purchased ? "border-gray-100 opacity-60" : "border-gray-100"}`}>
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.id)}
          className="w-4 h-4 accent-green-500"
        />
      )}
      <button
        onClick={() => onToggle(item.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          item.purchased ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
        }`}
      >
        {item.purchased && <span className="text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${item.purchased ? "line-through text-gray-400" : ""}`}>{item.name}</p>
        <p className="text-xs text-gray-400">
          {item.quantity ? `${item.quantity} ${item.unit} · ` : ""}{item.category}
        </p>
      </div>
      <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-gray-600 p-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </li>
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

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
