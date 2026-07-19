'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastProvider, useToast } from './components/Toast';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import { Shield } from 'lucide-react';

const API_URL = '/api';

function HomeContent() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Sync auth details with backend
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(res.data);
          setToken(storedToken);
        } catch (err) {
          console.error('[Session Verify Error]', err);
          // Token expired or server offline
          if (err.response?.status === 403 || err.response?.status === 401) {
            toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            handleLogout();
          } else {
            // Keep existing local user state if offline to prevent kick out, but alert
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          }
        }
      }
      setInitializing(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setUser(loggedInUser);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    toast.info('Đã đăng xuất tài khoản thành công.');
  };

  if (initializing) {
    /* Premium Loading Screen */
    return (
      <div className="min-h-screen bg-[#080b16] flex flex-col items-center justify-center p-6">
        <div className="relative flex flex-col items-center gap-4">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 animate-pulse">
            <Shield className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-sm font-bold tracking-widest text-indigo-300 animate-pulse">VALKYRIE SHOP</h2>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard user={user} token={token} onLogout={handleLogout} />;
}

export default function Home() {
  return (
    <ToastProvider>
      <HomeContent />
    </ToastProvider>
  );
}
