
import React, { useState } from 'react';
import { PlusCircle, History } from 'lucide-react';
import { OrderForm } from '../OrderForm/OrderForm';
import { OrderHistory } from '../History/OrderHistory';
import { User } from '@supabase/supabase-js';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'new-order' | 'history'>('new-order');

  // We removed the auto-sync effect here to prevent "Suresh Prasad" or any logged-in user 
  // from being automatically added to the global salesperson list. 
  // Management should be done manually via the SalesPersonManager or constants.

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm gap-1">
          <button
            onClick={() => setActiveTab('new-order')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'new-order' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'history' 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
        {activeTab === 'new-order' ? <OrderForm /> : <OrderHistory />}
      </div>
    </div>
  );
};
