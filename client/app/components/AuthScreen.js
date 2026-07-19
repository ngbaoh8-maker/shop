'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { Shield, Lock, User, ArrowRight, Activity } from 'lucide-react';

const API_URL = '/api';

export default function AuthScreen({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Login API Call
        const res = await axios.post(`${API_URL}/auth/login`, { username, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        toast.success(`Chào mừng trở lại, ${res.data.user.username}!`);
        onLoginSuccess(res.data.user, res.data.token);
      } else {
        // Register API Call
        await axios.post(`${API_URL}/auth/register`, { username, password });
        toast.success('Đăng ký tài khoản thành công! Hãy đăng nhập.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md glass rounded-3xl p-8 relative shadow-2xl border border-white/5 shadow-indigo-500/5">
        
        {/* Decorative Neon Top Line */}
        <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4 animate-float">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            VALKYRIE SHOP
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {isLogin ? 'Đăng nhập để trải nghiệm Token & Tool SaaS' : 'Tạo tài khoản để tham gia hệ thống'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Nhập tài khoản"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0a0d1a]/80 border border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0d1a]/80 border border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                required
                disabled={loading}
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                Nhập lại mật khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0a0d1a]/80 border border-white/5 hover:border-white/10 focus:border-indigo-500/50 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl py-3.5 px-4 font-semibold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group transition-all duration-300 transform active:scale-[0.98] cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <Activity className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                {isLogin ? 'Đăng Nhập' : 'Đăng Ký Ngay'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Form Toggle Link */}
        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? (
            <p>
              Chưa có tài khoản?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                disabled={loading}
              >
                Đăng ký ngay
              </button>
            </p>
          ) : (
            <p>
              Đã có tài khoản?{' '}
              <button
                onClick={() => setIsLogin(true)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                disabled={loading}
              >
                Đăng nhập
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
