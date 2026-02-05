import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, Check, Loader2, Trash2, Package, Truck, Hash, ReceiptText, Calendar, AlertCircle, Edit2, ShoppingBag, XCircle, Save, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { submitToGoogleSheets } from '../../services/googleSheets';
import { toast } from 'react-hot-toast';
import { OrderItem, Order } from '../../types';
import { BRANCHES, CATEGORIES, UOMS, BRANCH_SALES_PERSONS } from '../../constants';

const CATEGORY_DB_MAP: Record<string, string> = {
  'CKU': 'cku', 'CRO': 'cro', 'CUP': 'cup', 'DELHI': 'delhi', 'ELASTIC': 'elastic', 'EMBROIDARY': 'embroidary',
  'EYE_N_HOOK': 'eye_n_hook', 'PRINTING': 'printing', 'TLU': 'tlu', 'VAU': 'vau', 'WARP(UDHANA)': 'warp'
};

const DRAFT_KEY = 'ginza_order_draft';

// Improved unique ID generator: GNZ - Random4 - Last4OfTimestamp
const generateOrderId = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  const time = Date.now().toString().slice(-4);
  return `GNZ-${random}-${time}`;
};

export const OrderForm: React.FC = () => {
  const getInitialState = () => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const draft = getInitialState();

  const [orderId, setOrderId] = useState(draft?.orderId || generateOrderId());
  const [branch, setBranch] = useState(draft?.branch || '');
  const [salesPerson, setSalesPerson] = useState(draft?.salesPerson || '');
  const [salesPersonsList, setSalesPersonsList] = useState<string[]>([]);
  const [customerPONo, setCustomerPONo] = useState(draft?.customerPONo || '');
  const [transporterName, setTransporterName] = useState(draft?.transporterName || '');
  const [accountStatus, setAccountStatus] = useState(draft?.accountStatus || '');

  const [customerSearch, setCustomerSearch] = useState(draft?.customerSearch || '');
  const [customerEmail, setCustomerEmail] = useState(draft?.customerEmail || '');
  const [customerContact, setCustomerContact] = useState(draft?.customerContact || '');
  const [billingAddress, setBillingAddress] = useState(draft?.billingAddress || '');
  const [deliveryAddress, setDeliveryAddress] = useState(draft?.deliveryAddress || '');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<boolean>(draft?.selectedCustomer || false);

  const [currentItem, setCurrentItem] = useState(draft?.currentItem || {
    category: '', itemName: '', manualItem: false, color: '', width: '', uom: '', 
    quantity: '' as string, rate: '' as string, discount: '' as string, 
    dispatchDate: new Date().toISOString().split('T')[0], remark: ''
  });
  
  const [items, setItems] = useState<OrderItem[]>(draft?.items || []);
  const [itemSearch, setItemSearch] = useState(draft?.itemSearch || '');
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  useEffect(() => {
    const dataToSave = {
      orderId, branch, salesPerson, customerPONo, transporterName, accountStatus,
      customerSearch, customerEmail, customerContact, billingAddress, deliveryAddress,
      selectedCustomer, currentItem, items, itemSearch
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(dataToSave));
    setLastSaved(Date.now());
  }, [
    orderId, branch, salesPerson, customerPONo, transporterName, accountStatus,
    customerSearch, customerEmail, customerContact, billingAddress, deliveryAddress,
    selectedCustomer, currentItem, items, itemSearch
  ]);

  useEffect(() => {
    if (!branch || !salesPerson) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!branch) {
          const uBranch = user?.user_metadata?.branch;
          if (uBranch && uBranch !== 'N/A') setBranch(uBranch);
        }
        
        if (!salesPerson) {
          const firstName = user?.user_metadata?.first_name || '';
          const lastName = user?.user_metadata?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) setSalesPerson(fullName);
        }
      });
    }
  }, []);

  useEffect(() => {
    const fetchSales = async () => {
      if (!branch) { setSalesPersonsList([]); return; }
      
      if (branch === 'Delhi') {
        const delhiList = BRANCH_SALES_PERSONS['Delhi'] || [];
        setSalesPersonsList([...delhiList].sort((a, b) => a.localeCompare(b)));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sales_persons')
          .select('name')
          .eq('branch', branch);
        
        if (error) throw error;

        const hardcoded = BRANCH_SALES_PERSONS[branch] || [];
        const dbNames = data?.map(d => d.name) || [];
        
        const combined = Array.from(new Set([
          ...hardcoded.map(n => n.trim()), 
          ...dbNames.map(n => n.trim())
        ]))
        .filter(n => n.length > 0)
        .sort((a, b) => a.localeCompare(b));
        
        setSalesPersonsList(combined);
      } catch (err) {
        setSalesPersonsList(BRANCH_SALES_PERSONS[branch] || []);
      }
    };
    fetchSales();
  }, [branch]);

  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 1 || selectedCustomer || !branch) { 
        if (customerSearch.length === 0) setCustomers([]);
        return; 
      }
      
      setIsSearchingCustomer(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('branch', branch)
          .or(`customer_name.ilike.%${customerSearch}%,mob_no.ilike.%${customerSearch}%`)
          .limit(15);
        
        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error("Customer Search Error:", err);
      } finally {
        setIsSearchingCustomer(false);
      }
    };
    const timer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, branch, selectedCustomer]);

  useEffect(() => {
    const fetchProducts = async () => {
      const dbCol = CATEGORY_DB_MAP[currentItem.category];
      if (!dbCol || itemSearch.length === 0) { setSuggestedProducts([]); return; }
      setIsSearchingProduct(true);
      const { data } = await supabase.from('products').select('*').not(dbCol, 'is', null).neq(dbCol, '').ilike(dbCol, `%${itemSearch}%`).order(dbCol, { ascending: true }).limit(50);
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
    const finalItemName = currentItem.itemName || itemSearch;
    if (!currentItem.category || !finalItemName.trim() || !currentItem.uom || !currentItem.quantity || !currentItem.rate) {
      toast.error('Required fields missing');
      return;
    }

    const qty = Number(currentItem.quantity);
    const rate = Number(currentItem.rate);
    const disc = Number(currentItem.discount) || 0;
    
    const newItem: OrderItem = {
      id: editingId || crypto.randomUUID(),
      category: currentItem.category,
      itemName: finalItemName.trim(),
      manualItem: currentItem.manualItem,
      color: currentItem.color.trim() || 'STD',
      width: currentItem.width.trim() || 'STD',
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
      toast.success('Entry updated');
    } else {
      setItems(prev => [...prev, newItem]);
      toast.success('Added to preview batch');
    }

    setItemSearch('');
    setCurrentItem({ ...currentItem, itemName: '', color: '', width: '', quantity: '', rate: '', discount: '', remark: '' });
  };

  const handleEditItem = (item: OrderItem) => {
    setEditingId(item.id);
    setCurrentItem({
      category: item.category, itemName: item.itemName, manualItem: item.manualItem, color: item.color,
      width: item.width, uom: item.uom, quantity: String(item.quantity), rate: String(item.rate),
      discount: String(item.discount), dispatchDate: item.dispatchDate, remark: item.remark
    });
    setItemSearch(item.itemName);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleSubmitOrder = async () => {
    if (!customerSearch || !branch || !salesPerson || items.length === 0) {
      toast.error('Mandatory data missing'); 
      return;
    }
    setIsSubmitting(true);
    const order: Order = {
      id: orderId, 
      orderDate: new Date().toLocaleDateString('en-GB'),
      branch, salesPerson, customerPONo,
      customer: { id: '', name: customerSearch, email: customerEmail, contact_no: customerContact, address: billingAddress },
      billingAddress, deliveryAddress, accountStatus,
      items: items.map(it => ({ ...it, transportName: transporterName })), 
      timestamp: Date.now()
    };
    
    const success = await submitToGoogleSheets(order);
    if (success) {
      const history = JSON.parse(localStorage.getItem('ginza_order_history') || '[]');
      localStorage.setItem('ginza_order_history', JSON.stringify([order, ...history]));
      toast.success('Order Batch Synced Successfully');
      localStorage.removeItem(DRAFT_KEY);
      setItems([]); setCustomerPONo(''); setTransporterName(''); setAccountStatus(''); setCustomerSearch(''); 
      setSelectedCustomer(false); setBillingAddress(''); setDeliveryAddress(''); setCustomerContact(''); setCustomerEmail('');
      setOrderId(generateOrderId());
    } else {
      toast.error('Sync failed. Check connection.');
    }
    setIsSubmitting(false);
  };

  const clearDraft = () => {
    if (confirm('Clear current draft and start fresh?')) {
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 relative">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Order Identity</h3>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
              <Save className="h-2.5 w-2.5 text-emerald-500" /> Draft Auto-Saved
            </div>
          )}
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Order ID</label>
            <div className="bg-indigo-600 border border-indigo-700 rounded-xl px-4 py-3 text-sm font-black text-white tracking-widest shadow-inner flex items-center justify-between">
              {orderId}
              <RefreshCw className="h-3 w-3 opacity-30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Branch Select</label>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setSalesPerson(''); setCustomerSearch(''); setSelectedCustomer(false); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="">-- Choose Branch --</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Sales Personnel</label>
            <select value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} disabled={!branch} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="">-- Select Staff --</option>
              {salesPersonsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Customer PO Ref</label>
            <input type="text" value={customerPONo} onChange={(e) => setCustomerPONo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="PO Number" />
          </div>
        </div>
      </section>

      {/* CUSTOMER SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <User className="h-4 w-4 text-indigo-500" />
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Customer & Shipping</h3>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Customer Search*</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(false); }} disabled={!branch} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Search..." />
                {isSearchingCustomer && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-500" />}
              </div>
              <AnimatePresence>
                {customers.length > 0 && !selectedCustomer && (
                  <motion.div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {customers.map(c => (
                      <button key={c.id} onClick={() => onSelectCustomer(c)} className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex flex-col group transition-colors">
                        <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700">{c.customer_name}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{c.mob_no}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Contact No" />
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Email" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm h-16 resize-none font-bold" placeholder="Billing Address" />
            <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm h-16 resize-none font-bold" placeholder="Delivery Address" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input type="text" value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Account Status" />
            <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Transporter Details" />
          </div>
        </div>
      </section>

      {/* PRODUCT SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-indigo-600">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{editingId ? 'Modify Entry' : 'Product Selection'}</h3>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            <select value={currentItem.category} onChange={(e) => { setCurrentItem({...currentItem, category: e.target.value}); setItemSearch(''); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold">
              <option value="">Category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="md:col-span-2 relative">
              <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} onFocus={() => currentItem.category && setShowProductSuggestions(true)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Product Search..." />
              {showProductSuggestions && suggestedProducts.length > 0 && (
                <div className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {suggestedProducts.map(p => (
                    <button key={p.id} onClick={() => onSelectProduct(p)} className="w-full px-4 py-3 text-left hover:bg-indigo-50 text-sm font-bold">{p[CATEGORY_DB_MAP[currentItem.category]]}</button>
                  ))}
                </div>
              )}
            </div>
            <select value={currentItem.uom} onChange={(e) => setCurrentItem({...currentItem, uom: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold">
              <option value="">UOM</option>
              {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <input type="text" value={currentItem.color} onChange={(e) => setCurrentItem({...currentItem, color: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Color" />
            <input type="text" value={currentItem.width} onChange={(e) => setCurrentItem({...currentItem, width: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Width" />
            <input type="number" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Qty" />
            <input type="number" value={currentItem.rate} onChange={(e) => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Rate" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <input type="number" value={currentItem.discount} onChange={(e) => setCurrentItem({...currentItem, discount: e.target.value})} className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Disc %" />
            <input type="date" value={currentItem.dispatchDate} onChange={(e) => setCurrentItem({...currentItem, dispatchDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" />
            <input type="text" value={currentItem.remark} onChange={(e) => setCurrentItem({...currentItem, remark: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold col-span-1" placeholder="Remark" />
            <button onClick={addItemToPreview} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase hover:bg-indigo-600 transition-all">
              {editingId ? 'Update' : 'Add To Batch'}
            </button>
          </div>
        </div>
      </section>

      {/* SUMMARY BATCH */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden min-h-[150px]">
          <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
            <h3 className="text-white font-black text-[11px] uppercase tracking-widest">Order Summary Batch ({items.length})</h3>
            {items.length > 0 && <span className="text-sm font-black text-indigo-400">₹{items.reduce((s, i) => s + i.total, 0).toLocaleString()}</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.map(i => (
              <div key={i.id} className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-black text-sm text-slate-900">{i.itemName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{i.category} • {i.quantity} {i.uom}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-900">₹{i.total.toLocaleString()}</span>
                  <button onClick={() => handleEditItem(i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => setItems(items.filter(x => x.id !== i.id))} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex flex-col items-center gap-4 py-6">
            <button onClick={handleSubmitOrder} disabled={isSubmitting} className="px-16 py-4 bg-indigo-600 text-white rounded-full font-black uppercase tracking-widest shadow-xl flex items-center gap-3">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><p>Final Cloud Sync</p><Check className="h-5 w-5" /></>}
            </button>
            <button onClick={clearDraft} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clear Draft</button>
          </div>
        )}
      </div>
    </div>
  );
};