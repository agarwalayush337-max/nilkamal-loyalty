import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, RefreshCw } from 'lucide-react';

export default function DevRoleSwitcher() {
  const { user, activeRole, devRoleOverride, toggleDevRole } = useAuth();

  // Only show if a user session exists (either Firebase or Mock login is active)
  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {/* Visual Indicator of Dev Override State */}
      <div className="bg-slate-900/90 text-white border border-slate-700/80 rounded-2xl px-4 py-2 text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md max-w-xs transition-all duration-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
        <div className="leading-tight">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">
            Dev Mode
          </span>
          <span className="text-slate-100 flex items-center gap-1">
            {activeRole === 'admin' ? '👑 Master Admin' : '👷 Contractor'} 
            {devRoleOverride && <span className="text-[10px] text-brand-blue font-black">(Override)</span>}
          </span>
        </div>
      </div>

      {/* Actual Toggle Action FAB */}
      <button
        onClick={toggleDevRole}
        className="p-3 bg-brand-blue hover:bg-brand-blue/95 active:scale-95 text-white rounded-full shadow-2xl border-2 border-white cursor-pointer transition-all flex items-center justify-center group"
        title="Switch Dashboard Role instantly"
      >
        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-all duration-500" />
      </button>
    </div>
  );
}
