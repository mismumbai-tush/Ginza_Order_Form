
import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Check, Loader2, Trash2, Package, Truck, Hash, ReceiptText, Calendar, AlertCircle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { submitToGoogleSheets } from '../../services/googleSheets';
import { toast } from 'react-hot-toast';
import { OrderItem, Order } from '../../types';
import { BRANCHES, CATEGORIES, UOMS, BRANCH_SALES_PERSONS } from '../../constants';

const CATEGORY_DB_MAP: Record<string, string> = {
  'CKU': 'cku', 'CRO': 'cro', 'CUP': 'cup', 'ELASTIC': 'elastic', 'EMBROIDARY': 'embroidary',
  'EYE_N_HOOK': 'eye_n_hook', 'PRINTING': 'printing', 'TLU': 'tlu', 'VAU': 'vau', 'WARP(UDHANA)': 'warp'
};

export const OrderForm: React.FC = () => {
  const [branch, setBranch] = useState('');
  const [salesPerson, setSalesPerson] = useState('');
  const [salesPersonsList, setSalesPersonsList] = useState<string[]>([]);
  const [customerPONo, setCustomerPONo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [accountStatus, setAccountStatus] = useState('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<boolean>(false);

  const [currentItem, setCurrentItem] = useState({
    category: '', itemName: '', manualItem: false, color: '', width: '', uom: '', 
    quantity: '' as string, rate: '' as string, discount: '' as string, 
    dispatchDate: new Date().toISOString().split('T')[0], remark: ''
  });
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uBranch = user?.user_metadata?.branch;
      if (uBranch && uBranch !== 'N/A') setBranch(uBranch);
      const fullName = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim();
      if (fullName) setSalesPerson(fullName);
    });
  }, []);

  useEffect(() => {
    const fetchSales = async () => {
      if (!branch) { setSalesPersonsList([]); return; }
      try {
        const { data, error } = await supabase
          .from('sales_persons')
          .select('name')
          .eq('branch', branch);
        
        if (error) throw error;

        // Get hardcoded names from constants
        const hardcodedNames = BRANCH_SALES_PERSONS[branch] || [];
        // Get names from database
        const dbNames = data?.map(d => d.name) || [];
        
        // Merge both lists and remove duplicates using a Set
        const combined = Array.from(new Set([...hardcodedNames, ...dbNames])).sort((a, b) => a.localeCompare(b));
        
        setSalesPersonsList(combined);
      } catch (err) {
        // Fallback to hardcoded list if database fails
        setSalesPersonsList(BRANCH_SALES_PERSONS[branch] || []);
      }
    };
    fetchSales();
  }, [branch]);

  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 1 || selectedCustomer || !branch) { setCustomers([]); return; }
      setIsSearchingCustomer(true);
      const { data } = await supabase.from('customers').select('*').eq('branch', branch).ilike('customer_name', `${customerSearch}%`).limit(8);
      setCustomers(data || []);
      setIsSearchingCustomer(false);
    };
    const timer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, branch, selectedCustomer]);

  useEffect(() => {
    const fetchProducts = async () => {
      const dbCol = CATEGORY_DB_MAP[currentItem.category];
      if (!dbCol || itemSearch.length === 0) { setSuggestedProducts([]); return; }
      setIsSearchingProduct(true);
      const { data } = await supabase.from('products').select('*').not(dbCol, 'is', null).neq(dbCol, '').ilike(dbCol, `${itemSearch}%`).order(dbCol, { ascending: true }).limit(50);
      setSuggestedProducts(data || []);
      setIsSearchingProduct(false);
    };
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, currentItem.category]);

  const onSelectCustomer = (c: any) => {
    setCustomerSearch(c.customer_name);
    setCustomerEmail(c.email_id || '');
    setCustomerContact(c.mob_no || '');
    setBillingAddress(c.address || c.billing_address || c.full_address || '');
    setAccountStatus(c.account_status || ''); 
    setSelectedCustomer(true);
    setCustomers([]);
  };

  const onSelectProduct = (product: any) => {
    const dbCol = CATEGORY_DB_MAP[currentItem.category];
    const pName = product[dbCol] || '';
    const pWidth = product[`width_${dbCol}`] || product.width || '';
    setCurrentItem({ ...currentItem, itemName: pName, width: String(pWidth), uom: product.uom || '' });
    setItemSearch(pName);
    setShowProductSuggestions(false);
  };

  const addItemToPreview = () => {
    const finalItemName = (currentItem.manualItem || !currentItem.itemName) ? itemSearch : currentItem.itemName;
    
    if (!currentItem.category || !finalItemName || !currentItem.uom || !currentItem.quantity || !currentItem.rate) {
      toast.error('Mandatory fields missing (Unit, Name, UOM, Qty, Rate)');
      return;
    }

    const qty = Number(currentItem.quantity);
    const rate = Number(currentItem.rate);
    const disc = Number(currentItem.discount) || 0;
    
    const newItem: OrderItem = {
      id: editingId || crypto.randomUUID(),
      category: currentItem.category,
      itemName: finalItemName,
      manualItem: currentItem.manualItem,
      color: currentItem.color || 'STD',
      width: currentItem.width || 'STD',
      uom: currentItem.uom,
      quantity: qty,
      rate: rate,
      discount: disc,
      dispatchDate: currentItem.dispatchDate,
      transportName: transporterName,
      remark: currentItem.remark,
      total: (qty * rate) * (1 - (disc / 100))
    };

    if (editingId) {
      setItems(items.map(it => it.id === editingId ? newItem : it));
      setEditingId(null);
      toast.success('Item updated');
    } else {
      setItems([...items, newItem]);
      toast.success('Item added to list');
    }

    setItemSearch('');
    setCurrentItem({ 
      ...currentItem, 
      itemName: '', 
      color: '', 
      width: '', 
      quantity: '', 
      rate: '', 
      discount: '', 
      remark: '' 
    });
  };

  const handleEditItem = (item: OrderItem) => {
    setEditingId(item.id);
    setCurrentItem({
      category: item.category,
      itemName: item.itemName,
      manualItem: item.manualItem,
      color: item.color,
      width: item.width,
      uom: item.uom,
      quantity: String(item.quantity),
      rate: String(item.rate),
      discount: String(item.discount),
      dispatchDate: item.dispatchDate,
      remark: item.remark
    });
    setItemSearch(item.itemName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Item loaded into form');
  };

  const handleSubmitOrder = async () => {
    if (!customerSearch || !branch || !salesPerson || items.length === 0) {
      toast.error('Incomplete form or empty item list'); return;
    }
    setIsSubmitting(true);
    const order: Order = {
      id: `GNZ-${Date.now().toString().slice(-6)}`, orderDate: new Date().toLocaleDateString('en-GB'),
      branch, salesPerson, customerPONo,
      customer: { id: '', name: customerSearch, email: customerEmail, contact_no: customerContact, address: billingAddress },
      billingAddress, deliveryAddress, accountStatus,
      items: items.map(it => ({ ...it, transportName: transporterName })), timestamp: Date.now()
    };
    const success = await submitToGoogleSheets(order);
    if (success) {
      const history = JSON.parse(localStorage.getItem('ginza_order_history') || '[]');
      localStorage.setItem('ginza_order_history', JSON.stringify([order, ...history]));
      toast.success('Order Successfully Synced');
      setItems([]); setCustomerPONo(''); setTransporterName(''); setAccountStatus(''); setCustomerSearch(''); setSelectedCustomer(false);
      setBillingAddress(''); setDeliveryAddress(''); setCustomerContact(''); setCustomerEmail('');
    } else toast.error('Sync failed');
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* SECTION 1: IDENTITY */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Hash className="h-3 w-3 text-slate-400" />
          <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">Context</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Branch</label>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setSalesPerson(''); }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Select Branch</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Personnel</label>
            <select value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} disabled={!branch} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Select Staff</option>
              {salesPersonsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">PO Ref</label>
            <input type="text" value={customerPONo} onChange={(e) => setCustomerPONo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" placeholder="PO-XXXX" />
          </div>
        </div>
      </section>

      {/* SECTION 2: CLIENT & LOGISTICS */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <User className="h-3 w-3 text-indigo-500" />
          <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">Client & Logistics</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Client Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input type="text" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(false); }} disabled={!branch} className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold" placeholder="Search customer..." />
                {isSearchingCustomer && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-indigo-500" />}
              </div>
              <AnimatePresence>
                {customers.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-y-auto divide-y divide-slate-50">
                    {customers.map(c => (
                      <button key={c.id} onClick={() => onSelectCustomer(c)} className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex flex-col group">
                        <span className="text-[10px] font-bold text-slate-800">{c.customer_name}</span>
                        <span className="text-[8px] text-slate-400 uppercase">{c.mob_no || 'No Contact'}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Phone</label>
                <input type="text" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Email</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Billing Address</label>
              <textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] h-12 resize-none outline-none font-medium" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center px-0.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Delivery Address</label>
                <button onClick={() => setDeliveryAddress(billingAddress)} className="text-[8px] font-bold text-indigo-600 uppercase hover:underline">Sync Address</button>
              </div>
              <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] h-12 resize-none outline-none font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Account Status</label>
              <input type="text" value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" placeholder="Account status..." />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5 flex items-center gap-1"><Truck className="h-3 w-3 text-indigo-500" /> Transporter</label>
              <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" placeholder="Transporter name..." />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ADD PRODUCT */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Package className="h-3 w-3 text-emerald-600" />
          <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">{editingId ? 'Edit Product' : 'Add Product'}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Unit</label>
              <select value={currentItem.category} onChange={(e) => { setCurrentItem({...currentItem, category: e.target.value, itemName: ''}); setItemSearch(''); setShowProductSuggestions(!!e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold outline-none">
                <option value="">Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 relative space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Product Catalog</label>
              <div className="relative">
                <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} onFocus={() => currentItem.category && setShowProductSuggestions(true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-semibold" placeholder={currentItem.category ? `Finding...` : "Choose category"} disabled={!currentItem.category} />
                {isSearchingProduct && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />}
              </div>
              <AnimatePresence>
                {!currentItem.manualItem && showProductSuggestions && suggestedProducts.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-y-auto divide-y divide-slate-50">
                    {suggestedProducts.map((p, idx) => {
                      const dbCol = CATEGORY_DB_MAP[currentItem.category];
                      return (
                        <button key={p.id || idx} onClick={() => onSelectProduct(p)} className="w-full px-3 py-1 text-left hover:bg-slate-50 text-[9px] font-bold text-slate-700">{p[dbCol]}</button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">UOM</label>
              <select value={currentItem.uom} onChange={(e) => setCurrentItem({...currentItem, uom: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold">
                <option value="">UOM</option>
                {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Color</label><input type="text" value={currentItem.color} onChange={(e) => setCurrentItem({...currentItem, color: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" placeholder="STD" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Width</label><input type="text" value={currentItem.width} onChange={(e) => setCurrentItem({...currentItem, width: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" placeholder="STD" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Qty</label><input type="number" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Rate (₹)</label><input type="number" value={currentItem.rate} onChange={(e) => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Discount %</label><input type="number" value={currentItem.discount} onChange={(e) => setCurrentItem({...currentItem, discount: e.target.value})} className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-emerald-700" placeholder="0" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Dispatch Date</label><input type="date" value={currentItem.dispatchDate} onChange={(e) => setCurrentItem({...currentItem, dispatchDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-700" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Remark</label><input type="text" value={currentItem.remark} onChange={(e) => setCurrentItem({...currentItem, remark: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-medium" placeholder="Optional notes..." /></div>
            <div>
              <button onClick={addItemToPreview} className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95">
                {editingId ? <><Edit2 className="h-3 w-3" /> Update</> : <><Plus className="h-3 w-3" /> Add Item</>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: BATCH REVIEW & SYNC */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pb-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-3.5 w-3.5 text-indigo-400" />
                  <h3 className="text-white font-bold text-[9px] uppercase tracking-widest">Summary ({items.length})</h3>
                </div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">₹{items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr><th className="px-4 py-1.5">Item Details</th><th className="px-4 py-1.5 text-right">Qty/Rate</th><th className="px-4 py-1.5 text-right">Total</th><th className="px-4 py-1.5 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(i => (
                      <tr key={i.id} className="text-[10px] hover:bg-slate-50/50">
                        <td className="px-4 py-1.5">
                          <p className="font-bold text-slate-900 truncate max-w-[150px]">{i.itemName}</p>
                          <p className="text-[8px] text-slate-400 uppercase tracking-tighter">{i.category} • Color: {i.color} • Width: {i.width}</p>
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          <p className="font-semibold">{i.quantity} {i.uom}</p>
                          <p className="text-[8px] text-slate-400">@ ₹{i.rate}</p>
                        </td>
                        <td className="px-4 py-1.5 text-right font-black text-slate-900">
                          ₹{i.total.toLocaleString()}
                          {i.discount > 0 && <span className="block text-[8px] text-emerald-600">-{i.discount}%</span>}
                        </td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditItem(i)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit"><Edit2 className="h-3 w-3" /></button>
                            <button onClick={() => setItems(items.filter(x => x.id !== i.id))} className="p-1 text-slate-300 hover:text-red-500 transition-colors" title="Remove"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] flex items-center gap-1">
                <AlertCircle className="h-2.5 w-2.5 text-indigo-400" /> Verify all details before cloud sync
              </p>
              <button onClick={handleSubmitOrder} disabled={isSubmitting} className="group flex items-center gap-3 px-10 py-2.5 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span></> : <><p className="text-base font-black uppercase tracking-widest">Sync Batch</p><Check className="h-3.5 w-3.5" /></>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
