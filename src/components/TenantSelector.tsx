import React from 'react';
import { Tenant } from '../types';
import { Building2, Store, ShieldCheck, Sparkles, PlusCircle } from 'lucide-react';

interface TenantSelectorProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  onSelectTenant: (tenantId: string) => void;
  currentView: 'public' | 'admin';
  onChangeView: (view: 'public' | 'admin') => void;
  onSimulateOrder: () => void;
}

export default function TenantSelector({
  tenants,
  currentTenant,
  onSelectTenant,
  currentView,
  onChangeView,
  onSimulateOrder
}: TenantSelectorProps) {
  return (
    <div 
      id="tenant-demo-selector-bar"
      className="bg-slate-950 text-slate-100 px-4 py-2.5 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between sticky top-0 z-50 shadow-md font-sans"
    >
      {/* Branding & Mode info */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
          <Building2 className="w-4 h-4 animate-pulse" />
        </div>
        <div className="leading-tight">
          <h1 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            PWA Multi-Inquilino 
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono font-medium">
              DEMO LIVE
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Venta de Productos Químicos e Inventario
          </p>
        </div>
      </div>

      {/* Active Tenant Passive Badge - No longer a dropdown in public view */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden md:inline">
          Punto de Venta Activo:
        </span>
        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
            🏢 {currentTenant.name}
          </span>
        </div>
      </div>

      {/* Toggle View & Quick Simulation */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Mode Buttons */}
        <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
          <button
            id="btn-view-public"
            onClick={() => onChangeView('public')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              currentView === 'public'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Tienda Pública</span>
          </button>
          
          <button
            id="btn-view-admin"
            onClick={() => onChangeView('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
              currentView === 'admin'
                ? 'bg-emerald-600 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Panel Admin</span>
          </button>
        </div>

        {/* Quick Mock Order Button */}
        <button
          id="btn-simulate-mock-order"
          onClick={onSimulateOrder}
          title="Simular un pedido de un cliente externo en tiempo real para ver las alertas de notificación"
          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium cursor-pointer border border-emerald-500/20 active:scale-95 transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Simular Pedido</span>
        </button>
      </div>
    </div>
  );
}
