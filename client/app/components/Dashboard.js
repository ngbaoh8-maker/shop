'use client';
import React, { useState } from 'react';
import { 
  Coins, Terminal, ShoppingBag, User, ShieldAlert, LogOut, 
  Menu, X, Shield, Activity 
} from 'lucide-react';
import TokenSection from './TokenSection';
import ToolSection from './ToolSection';
import OrdersSection from './OrdersSection';
import ProfileSection from './ProfileSection';
import AdminSection from './AdminSection';
import SupportWidget from './SupportWidget';

export default function Dashboard({ user, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('token');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'token', name: 'Token', icon: Coins },
    { id: 'tool', name: 'Tool', icon: Terminal },
    { id: 'orders', name: 'Đơn Hàng', icon: ShoppingBag },
    { id: 'profile', name: 'Hồ Sơ Cá Nhân', icon: User }
  ];

  const hasAdminRights = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  if (hasAdminRights) {
    // Insert Admin tab at the end
    menuItems.push({ id: 'admin', name: 'Quản Trị Viên', icon: ShieldAlert });
  }

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'token':
        return <TokenSection token={token} />;
      case 'tool':
        return <ToolSection token={token} />;
      case 'orders':
        return <OrdersSection token={token} />;
      case 'profile':
        return <ProfileSection user={user} onLogout={onLogout} />;
      case 'admin':
        return hasAdminRights ? <AdminSection token={token} userRole={user.role} /> : null;
      default:
        return <TokenSection token={token} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      
      {/* 1. MOBILE HEADER */}
      <header className="md:hidden glass border-b border-white/5 p-4 flex justify-between items-center z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span className="font-extrabold text-sm tracking-wider text-slate-100">VALKYRIE SHOP</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-400 hover:text-white p-1 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* 2. SIDEBAR FOR PC & TABLET / OVERLAY FOR MOBILE */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 glass border-r border-white/5 z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col justify-between
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-6 h-6 text-indigo-400 animate-float" />
              <span className="font-extrabold text-base tracking-wider text-white">VALKYRIE SHOP</span>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User profile capsule */}
          <div className="p-3.5 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm uppercase">
              {user?.username.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-200 truncate">{user?.username}</p>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mt-0.5">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/20 shadow-inner' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 text-red-500" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto z-10 relative">
        {/* Glow decoration */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -z-10"></div>
        
        {/* Dynamic section contents */}
        <div 
          className="max-w-6xl mx-auto"
          style={{
            animation: 'fadeIn 0.4s ease-out forwards'
          }}
        >
          {renderActiveSection()}
        </div>
      </main>

      {/* Floating support buttons */}
      <SupportWidget />

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            transform: translateY(8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
