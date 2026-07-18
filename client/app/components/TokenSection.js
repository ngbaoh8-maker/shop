'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { Coins, ShoppingCart, HelpCircle, Download, CheckCircle, Clock, Copy, X } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function TokenSection({ token }) {
  const [qty, setQty] = useState(10);
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  const toast = useToast();
  const pollInterval = useRef(null);

  const pricePerToken = 800;
  const totalAmount = qty * pricePerToken;

  // Handle Order submit
  const handleBuyToken = async (e) => {
    e.preventDefault();
    if (qty < 10) {
      toast.error('Số lượng mua tối thiểu là 10 Token.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/orders/token`,
        { quantity: qty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCheckoutData(res.data);
      setOrderStatus('PENDING');
      toast.success('Đơn hàng đã được tạo. Vui lòng thanh toán qua QR.');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể tạo đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  // Poll for status check
  useEffect(() => {
    if (checkoutData && checkoutData.order) {
      const orderId = checkoutData.order.id;
      
      pollInterval.current = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/orders`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const currentOrder = res.data.find(o => o.id === orderId);
          if (currentOrder) {
            if (currentOrder.status === 'APPROVED') {
              setOrderStatus('APPROVED');
              setDownloadUrl(`${API_URL}/orders/${orderId}/download`);
              toast.success('Thanh toán thành công! Bạn có thể tải file ngay.');
              clearInterval(pollInterval.current);
            } else if (currentOrder.status === 'REJECTED') {
              setOrderStatus('REJECTED');
              toast.error('Đơn hàng thanh toán đã bị từ chối.');
              clearInterval(pollInterval.current);
            }
          }
        } catch (error) {
          console.error('[Polling status error]', error);
        }
      }, 4000);
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [checkoutData, token]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const closeCheckout = () => {
    setCheckoutData(null);
    setOrderStatus('PENDING');
    setDownloadUrl(null);
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Coins className="w-7 h-7 text-indigo-400" />
          Mua Dịch Vụ Token
        </h2>
        <p className="text-gray-400 text-sm mt-1">Dịch vụ mua Token tự động nhanh chóng và an toàn nhất.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Descriptions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Token là gì?
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Token là khóa truy cập tài khoản được định dạng chuỗi ký tự bảo mật, được sử dụng để tương tác với các API của hệ thống tự động, chạy các bot, gửi yêu cầu hàng loạt hoặc các tác vụ phát triển phần mềm mà không cần nhập thông tin tài khoản mật khẩu chính.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5">
                <span className="text-xs font-bold text-indigo-400 uppercase">Loại Token</span>
                <p className="text-sm text-slate-200 mt-1 font-semibold">Token Chất Lượng Cao (HQ)</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5">
                <span className="text-xs font-bold text-indigo-400 uppercase">Định dạng bàn giao</span>
                <p className="text-sm text-slate-200 mt-1 font-semibold">File text (.TXT)</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Bảng giá & Quy định</h3>
            <div className="divide-y divide-white/5">
              <div className="flex justify-between py-3">
                <span className="text-gray-400 text-sm">Đơn giá</span>
                <span className="text-indigo-400 font-bold text-sm">800 VNĐ / Token</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400 text-sm">Số lượng mua tối thiểu</span>
                <span className="text-slate-200 font-bold text-sm">10 Token</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-400 text-sm">Thời gian bàn giao</span>
                <span className="text-emerald-400 font-semibold text-sm">Ngay sau khi duyệt thanh toán</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Buy Card Form */}
        <div className="lg:col-span-1">
          <div className="glass rounded-3xl p-6 border border-white/5 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
            
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              Đặt hàng Token
            </h3>

            <form onSubmit={handleBuyToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                  Số lượng Token cần mua
                </label>
                <input
                  type="number"
                  min="10"
                  value={qty}
                  onChange={(e) => setQty(Math.max(10, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#0a0d1a]/85 border border-white/5 focus:border-indigo-500/50 rounded-2xl py-3 px-4 text-sm text-white placeholder-gray-500 outline-none transition-all"
                  required
                  disabled={loading}
                />
                <span className="text-[11px] text-gray-500 mt-1 block pl-1">Số lượng tối thiểu là 10.</span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/10 space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Đơn giá</span>
                  <span>800 VNĐ</span>
                </div>
                <div className="flex justify-between font-bold text-slate-200 text-sm border-t border-white/5 pt-2">
                  <span>Tổng thanh toán</span>
                  <span className="text-indigo-400 font-extrabold">{totalAmount.toLocaleString()} VNĐ</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 group transition-all duration-300 transform active:scale-95 cursor-pointer"
                disabled={loading}
              >
                Mua Token
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Checkout QR Code Modal Overlay */}
      {checkoutData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div 
            className="w-full max-w-xl glass rounded-3xl p-6 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'panelOpen 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <h3 className="font-extrabold text-lg text-white">Thanh Toán Đơn Hàng Token</h3>
                <p className="text-xs text-gray-400 mt-0.5">Mã đơn: <span className="font-mono text-indigo-400 font-semibold">{checkoutData.order.id}</span></p>
              </div>
              <button 
                onClick={closeCheckout}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-6 flex flex-col md:flex-row gap-6 items-center">
              
              {/* QR side */}
              <div className="w-full md:w-1/2 flex flex-col items-center gap-3">
                {orderStatus === 'PENDING' ? (
                  <div className="relative p-3 bg-white rounded-2xl shadow-xl">
                    <img 
                      src={checkoutData.qrUrl} 
                      alt="VietQR Payment Code" 
                      className="w-48 h-48 object-contain"
                    />
                    <div className="absolute inset-0 bg-transparent flex items-center justify-center">
                      {/* Optional logo overlays */}
                    </div>
                  </div>
                ) : orderStatus === 'APPROVED' ? (
                  <div className="w-48 h-48 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center text-emerald-400 gap-3">
                    <CheckCircle className="w-16 h-16 animate-bounce" />
                    <span className="font-bold text-sm text-center px-4">Đã Thanh Toán Thành Công</span>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center justify-center text-red-400 gap-3">
                    <X className="w-16 h-16" />
                    <span className="font-bold text-sm text-center px-4">Thanh Toán Bị Từ Chối</span>
                  </div>
                )}
                
                <span className="text-[11px] font-semibold tracking-wider text-indigo-400 uppercase flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Đang Đợi Giao Dịch...
                </span>
              </div>

              {/* Bank Details Side */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3 text-xs">
                  <div>
                    <span className="text-gray-400 block">Ngân hàng</span>
                    <span className="text-slate-100 font-bold">{checkoutData.bankDetails.bankName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Số tài khoản</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-slate-100 font-bold font-mono text-sm">{checkoutData.bankDetails.accountNo}</span>
                      <button 
                        onClick={() => copyToClipboard(checkoutData.bankDetails.accountNo, 'Số tài khoản')}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Tên tài khoản</span>
                    <span className="text-slate-100 font-bold">{checkoutData.bankDetails.accountName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Số tiền cần chuyển</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-indigo-400 font-extrabold text-sm">{checkoutData.bankDetails.amount.toLocaleString()} VNĐ</span>
                      <button 
                        onClick={() => copyToClipboard(checkoutData.bankDetails.amount, 'Số tiền')}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Nội dung chuyển khoản (bắt buộc nhập đúng)</span>
                    <div className="flex items-center justify-between mt-0.5 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <span className="text-indigo-300 font-extrabold font-mono text-sm">{checkoutData.bankDetails.message}</span>
                      <button 
                        onClick={() => copyToClipboard(checkoutData.bankDetails.message, 'Nội dung chuyển khoản')}
                        className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {orderStatus === 'APPROVED' && downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all duration-300 cursor-pointer"
                  >
                    <Download className="w-4.5 h-4.5" />
                    Tải File Token Ngay
                  </a>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
