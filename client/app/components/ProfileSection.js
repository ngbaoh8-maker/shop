'use client';
import React from 'react';
import { User, Shield, AlertCircle, LogOut } from 'lucide-react';

export default function ProfileSection({ user, onLogout }) {
  if (!user) return null;

  const roleLabels = {
    USER: 'Khách hàng',
    ADMIN: 'Quản trị viên (Admin)',
    SUPER_ADMIN: 'Quản trị viên tối cao (Super Admin)'
  };

  const roleColors = {
    USER: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    ADMIN: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    SUPER_ADMIN: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Hồ Sơ Cá Nhân</h2>
        <p className="text-gray-400 text-sm mt-1">Thông tin chi tiết về tài khoản của bạn trên hệ thống.</p>
      </div>

      <div className="glass rounded-3xl p-8 border border-white/5 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10"></div>
        
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
            <User className="w-12 h-12" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-slate-100">{user.username}</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mt-2 ${roleColors[user.role]}`}>
              <Shield className="w-3 h-3" />
              {roleLabels[user.role]}
            </span>
          </div>
        </div>

        <div className="py-6 space-y-4 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-gray-400">Mã định danh (ID)</span>
            <span className="font-mono text-slate-300">{user.id}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-gray-400">Tên tài khoản</span>
            <span className="text-slate-300 font-bold">{user.username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-gray-400">Trạng thái</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Bị khóa'}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất tài khoản
        </button>
      </div>
    </div>
  );
}
