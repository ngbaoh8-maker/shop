'use client';
import React, { useState } from 'react';
import { HelpCircle, MessageSquare, ExternalLink, X } from 'lucide-react';

const ADMINS = [
  {
    name: 'Admin 1',
    link: 'https://discord.com/users/1493563825813852291',
    color: 'from-blue-600 via-indigo-600 to-purple-600'
  },
  {
    name: 'Admin 2',
    link: 'https://discord.com/users/1506844435919540304',
    color: 'from-indigo-600 via-purple-600 to-pink-600'
  }
];

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Expanded Support Panel */}
      {isOpen && (
        <div 
          className="mb-4 w-80 glass rounded-3xl p-5 border border-white/10 shadow-2xl animate-float shadow-indigo-500/10"
          style={{
            animation: 'panelOpen 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              </div>
              <span className="font-bold text-sm text-slate-200">Liên Hệ Hỗ Trợ 24/7</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full p-1 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Cards Grid */}
          <div className="space-y-3">
            {ADMINS.map((admin, idx) => (
              <a
                key={idx}
                href={admin.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group relative overflow-hidden rounded-2xl p-4 border border-white/5 bg-slate-900/60 hover:bg-slate-900/80 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.99] shadow-lg cursor-pointer"
                style={{
                  boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* Background glow hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10 filter blur-xl" />
                
                <div className="flex items-center gap-3">
                  {/* Discord Logo Wrapper with Neon Glow */}
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${admin.color} text-white shadow-md shadow-indigo-500/10 group-hover:shadow-indigo-500/30 transition-shadow duration-300 relative`}>
                    <svg
                      className="w-6 h-6 fill-current"
                      viewBox="0 0 127.14 96.36"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C-3.4,41.48-3.1,74.59,19.24,96.36a107.12,107.12,0,0,0,32.22-16.14,78.29,78.29,0,0,0,6.77-11A68.64,68.64,0,0,1,45.8,63.14a48.74,48.74,0,0,0,4,3.13,76.77,76.77,0,0,0,54.67,0,48.74,48.74,0,0,0,4-3.13,68.64,68.64,0,0,1-12.43,6.08,78.29,78.29,0,0,0,6.77,11,107.12,107.12,0,0,0,32.22,16.14C130.24,74.59,130.54,41.48,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.42,65.69,73.24,60,73.24,53S78.42,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                    </svg>
                    {/* Glowing point */}
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-slate-950"></span>
                  </div>

                  {/* Info details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors">
                        {admin.name}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[11px] font-semibold text-emerald-400 tracking-wide uppercase">
                        Hỗ trợ trực tuyến
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass p-4 rounded-full border border-indigo-500/20 text-indigo-400 hover:text-white shadow-2xl flex items-center justify-center gap-2 group transition-all duration-300 transform active:scale-95 cursor-pointer relative"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 100%)',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.1), inset 0 0 10px rgba(99, 102, 241, 0.05)'
        }}
      >
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#080b16] animate-pulse"></span>
        
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <svg
              className="w-5 h-5 fill-current animate-pulse"
              viewBox="0 0 127.14 96.36"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C-3.4,41.48-3.1,74.59,19.24,96.36a107.12,107.12,0,0,0,32.22-16.14,78.29,78.29,0,0,0,6.77-11A68.64,68.64,0,0,1,45.8,63.14a48.74,48.74,0,0,0,4,3.13,76.77,76.77,0,0,0,54.67,0,48.74,48.74,0,0,0,4-3.13,68.64,68.64,0,0,1-12.43,6.08,78.29,78.29,0,0,0,6.77,11,107.12,107.12,0,0,0,32.22,16.14C130.24,74.59,130.54,41.48,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.42,65.69,73.24,60,73.24,53S78.42,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
            </svg>
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out font-bold text-xs whitespace-nowrap text-slate-200">
              Liên Hệ Admin
            </span>
          </>
        )}
      </button>
    </div>
  );
}
