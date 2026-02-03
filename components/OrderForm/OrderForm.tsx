
import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Check, Loader2, Trash2, Package, Truck, Hash, ReceiptText, Calendar, AlertCircle, Edit2, ShoppingBag, XCircle } from 'lucide-react';
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

  // Initial Auth Check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uBranch = user?.user_metadata?.branch;
      if (uBranch && uBranch !== 'N/A') setBranch(uBranch);
      
      const firstName = user?.user_metadata?.first_name || '';
      const lastName = user?.user_metadata?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (fullName) {
        setSalesPerson(fullName);
      }
    });
  }, []);

  // Fetch and Sync Salesperson List
  useEffect(() => {
    const fetchSales = async () => {
      if (!branch) { setSalesPersonsList([]); return; }
      
      // STRICT OVERRIDE FOR DELHI
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

  // Customer Search Logic - IMPROVED SEARCH
  useEffect(() => {
    const searchCustomers = async () => {
      // Clear if search is short or already selected
      if (customerSearch.length < 1 || selectedCustomer || !branch) { 
        if (customerSearch.length === 0) setCustomers([]);
        return; 
      }
      
      setIsSearchingCustomer(true);
      try {
        // Search by Name OR Mobile Number with wildcard support
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

  // Product Search Logic
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
    
    if (!currentItem.category) { toast.error('Unit/Category selection required'); return; }
    if (!finalItemName.trim()) { toast.error('Item Name cannot be empty'); return; }
    if (!currentItem.uom) { toast.error('UOM selection required'); return; }
    if (!currentItem.quantity || Number(currentItem.quantity) <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (!currentItem.rate || Number(currentItem.rate) <= 0) { toast.error('Rate must be greater than 0'); return; }

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
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleSubmitOrder = async () => {
    if (!customerSearch || !branch || !salesPerson || items.length === 0) {
      toast.error('Mandatory data missing'); 
      return;
    }
    setIsSubmitting(true);
    const order: Order = {
      id: `GNZ-${Date.now().toString().slice(-6)}`, 
      orderDate: new Date().toLocaleDateString('en-GB'),
      branch, 
      salesPerson, 
      customerPONo,
      customer: { id: '', name: customerSearch, email: customerEmail, contact_no: customerContact, address: billingAddress },
      billingAddress, 
      deliveryAddress, 
      accountStatus,
      items: items.map(it => ({ ...it, transportName: transporterName })), 
      timestamp: Date.now()
    };
    
    const success = await submitToGoogleSheets(order);
    if (success) {
      const history = JSON.parse(localStorage.getItem('ginza_order_history') || '[]');
      localStorage.setItem('ginza_order_history', JSON.stringify([order, ...history]));
      toast.success('Order Batch Synced Successfully');
      setItems([]); 
      setCustomerPONo(''); 
      setTransporterName(''); 
      setAccountStatus(''); 
      setCustomerSearch(''); 
      setSelectedCustomer(false);
      setBillingAddress(''); 
      setDeliveryAddress(''); 
      setCustomerContact(''); 
      setCustomerEmail('');
    } else {
      toast.error('Sync failed. Check connection.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-24">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Hash className="h-3 w-3 text-slate-400" />
          <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">Order Identity</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Branch Select</label>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setSalesPerson(''); setCustomerSearch(''); setSelectedCustomer(false); }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">-- Choose Branch --</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Sales Personnel</label>
            <select value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} disabled={!branch} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">-- Select Staff --</option>
              {salesPersonsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Customer PO Ref</label>
            <input type="text" value={customerPONo} onChange={(e) => setCustomerPONo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" placeholder="e.g. PO-12345" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <User className="h-3 w-3 text-indigo-500" />
          <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">Customer & Shipping</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Customer Search (Name/Mobile)*</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input type="text" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(false); }} disabled={!branch} className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold" placeholder={branch ? "Search by name or phone..." : "Select branch first"} />
                {isSearchingCustomer && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-indigo-500" />}
              </div>
              <AnimatePresence>
                {customers.length > 0 && !selectedCustomer && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {customers.map(c => (
                      <button key={c.id} onClick={() => onSelectCustomer(c)} className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex flex-col group transition-colors">
                        <span className="text-[10px] font-black text-slate-800 group-hover:text-indigo-700">{c.customer_name}</span>
                        <div className="flex justify-between items-center mt-0.5">
                          <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">{c.mob_no || 'Contact N/A'}</span>
                          <span className="text-[7px] bg-slate-100 text-slate-500 px-1 rounded">{c.branch}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Contact No</label>
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
              <textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] h-14 resize-none outline-none font-medium" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center px-0.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Delivery Address</label>
                <button onClick={() => setDeliveryAddress(billingAddress)} className="text-[8px] font-black text-indigo-600 uppercase hover:underline">Copy From Billing</button>
              </div>
              <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] h-14 resize-none outline-none font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Account Status</label>
              <input type="text" value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" placeholder="Account summary..." />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-0.5 flex items-center gap-1"><Truck className="h-3 w-3 text-indigo-500" /> Transporter</label>
              <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold" placeholder="Enter transporter name..." />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-indigo-600">
        <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3 text-emerald-600" />
            <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">{editingId ? 'Modify Selection' : 'Product Selection'}</h3>
          </div>
          {editingId && <button onClick={() => { setEditingId(null); setItemSearch(''); }} className="text-[8px] font-black text-red-500 uppercase flex items-center gap-1"><XCircle className="h-2.5 w-2.5" /> Cancel Edit</button>}
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Unit / Category</label>
              <select value={currentItem.category} onChange={(e) => { setCurrentItem({...currentItem, category: e.target.value, itemName: ''}); setItemSearch(''); setShowProductSuggestions(!!e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 relative space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-indigo-600">Product Search*</label>
              <div className="relative">
                <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} onFocus={() => currentItem.category && setShowProductSuggestions(true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-semibold" placeholder={currentItem.category ? `Search in ${currentItem.category}...` : "Choose category first"} disabled={!currentItem.category} />
                {isSearchingProduct && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />}
              </div>
              <AnimatePresence>
                {!currentItem.manualItem && showProductSuggestions && suggestedProducts.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                    {suggestedProducts.map((p, idx) => {
                      const dbCol = CATEGORY_DB_MAP[currentItem.category];
                      return (
                        <button key={p.id || idx} onClick={() => onSelectProduct(p)} className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-[10px] font-bold text-slate-700">{p[dbCol]}</button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">UOM</label>
              <select value={currentItem.uom} onChange={(e) => setCurrentItem({...currentItem, uom: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-semibold">
                <option value="">Select UOM</option>
                {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Color</label><input type="text" value={currentItem.color} onChange={(e) => setCurrentItem({...currentItem, color: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" placeholder="STD" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Width</label><input type="text" value={currentItem.width} onChange={(e) => setCurrentItem({...currentItem, width: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" placeholder="STD" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-indigo-600">Quantity*</label><input type="number" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-indigo-600">Rate (₹)*</label><input type="number" value={currentItem.rate} onChange={(e) => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Discount %</label><input type="number" value={currentItem.discount} onChange={(e) => setCurrentItem({...currentItem, discount: e.target.value})} className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-emerald-700" placeholder="0" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Dispatch Date</label><input type="date" value={currentItem.dispatchDate} onChange={(e) => setCurrentItem({...currentItem, dispatchDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-700" /></div>
            <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Remark</label><input type="text" value={currentItem.remark} onChange={(e) => setCurrentItem({...currentItem, remark: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-medium" placeholder="Specific instructions..." /></div>
            <div>
              <button onClick={addItemToPreview} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-md">
                {editingId ? <><Edit2 className="h-3 w-3" /> Update Entry</> : <><Plus className="h-3 w-3" /> Add To Summary</>}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-2" id="order-summary-box">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[180px]">
          <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-3.5 w-3.5 text-indigo-400" />
              <h3 className="text-white font-bold text-[10px] uppercase tracking-widest">Order Summary Batch ({items.length})</h3>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-4">
                <button onClick={() => { if(confirm('Clear all items?')) setItems([]); }} className="text-[8px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest mr-2">Clear Batch</button>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Grand Total:</span> ₹{items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="p-4 bg-slate-50 rounded-full">
                  <ShoppingBag className="h-10 w-10 opacity-10" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-30">Summary Basket is Empty</p>
                  <p className="text-[9px] font-medium opacity-20 mt-1">Fill the "Product Selection" above and click "Add To Summary"</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3">Product Details</th>
                    <th className="px-5 py-3 text-right">Volume / Rate</th>
                    <th className="px-5 py-3 text-right">Total (Net)</th>
                    <th className="px-5 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(i => (
                    <tr key={i.id} className="text-[10px] hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-black text-slate-900 truncate max-w-[250px]">{i.itemName}</p>
                        <p className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">
                          Unit: {i.category} • Color: <span className="text-slate-600">{i.color}</span> • Width: <span className="text-slate-600">{i.width}</span>
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-bold text-slate-800">{i.quantity.toLocaleString()} {i.uom}</p>
                        <p className="text-[8px] text-slate-400 font-black">@ ₹{i.rate.toLocaleString()}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-black text-slate-900">
                        ₹{i.total.toLocaleString()}
                        {i.discount > 0 && <span className="block text-[8px] text-emerald-600 font-black">-{i.discount}% Applied</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEditItem(i)} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Modify"><Edit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setItems(items.filter(x => x.id !== i.id))} className="p-2 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 bg-white px-5 py-2 rounded-full border border-slate-100 shadow-sm">
              <AlertCircle className="h-3 w-3 text-indigo-500" /> Confirm items ({items.length}) before syncing to Ginza Master Sheet
            </p>
            <button onClick={handleSubmitOrder} disabled={isSubmitting} className="group relative flex items-center gap-4 px-16 py-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-[0.97]">
              {isSubmitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /><span className="text-xs font-black uppercase tracking-widest">Encrypting & Syncing...</span></>
              ) : (
                <><p className="text-sm font-black uppercase tracking-widest">Final Cloud Sync</p><Check className="h-5 w-5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
