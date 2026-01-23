
import React from 'react';
import { User } from '@supabase/supabase-js';
import { LogOut, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase.ts';
import { toast } from 'react-hot-toast';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, children }) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error('Logout failed');
  };

  const metadata = user.user_metadata || {};
  const firstName = metadata.first_name || '';
  const lastName = metadata.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0];
  const branch = metadata.branch && metadata.branch !== 'N/A' ? metadata.branch : 'Corporate';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-0.5 rounded-lg border border-slate-100 shadow-sm">
              <img 
                src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
                alt="Ginza Industries" 
                className="h-7 w-auto object-contain mix-blend-multiply"
              />
            </div>
            <div className="hidden md:flex flex-col border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold text-slate-900 flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5 text-indigo-600" /> {branch}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-900 leading-none">{fullName}</span>
              </div>
              <span className="text-[8px] text-slate-400 font-medium mt-0.5">{user.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-slate-100"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
            Ginza Industries &copy; 2025 • Authorized Access Only
          </p>
          <img 
            src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
            className="h-3 opacity-20 grayscale" 
            alt="logo" 
          />
        </div>
      </footer>
    </div>
  );
};
