'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { ShoppingBag, Eye, Download, Info, CheckCircle2, Clock, XCircle, ArrowRight, Copy, X } from 'lucide-react';

const API_URL = '/api';

export default function OrdersSection({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);
  
  const toast = useToast();

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải lịch sử đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const handleRepay = (order) => {
    const qrUrl = `https://img.vietqr.io/image/MB-VQRQAGFUD5594-compact2.png?amount=${order.totalAmount}&addInfo=${order.transferMessage}&accountName=SHOP_TOKEN_TOOL`;
    setActivePaymentOrder({
      order,
      qrUrl,
      bankDetails: {
        bankName: 'MB Bank (Ngân Hàng Quân Đội)',
        accountNo: 'VQRQAGFUD5594',
        accountName: 'SHOP TOKEN TOOL',
        amount: order.totalAmount,
        message: order.transferMessage
      }
    });
  };

  const statusTags = {
    PENDING: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold text-amber-400 bg-amber-500/10 border-amber-500/20">
        <Clock className="w-3 h-3" />
        Đợi duyệt
      </span>
    ),
    APPROVED: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Đã duyệt
      </span>
    ),
    REJECTED: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold text-red-400 bg-red-500/10 border-red-500/20">
        <XCircle className="w-3 h-3" />
        Từ chối
      </span>
    )
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-indigo-400" />
            Lịch Sử Đơn Hàng
          </h2>
          <p className="text-gray-400 text-sm mt-1">Quản lý và tải về các dịch vụ đã thanh toán.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-white/5 hover:border-white/10 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
        >
          Làm mới
        </button>
      </div>

      {loading ? (
        /* Loading skeleton */
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-1/4 rounded skeleton"></div>
                <div className="h-4 w-1/3 rounded skeleton"></div>
              </div>
              <div className="h-10 w-28 rounded-xl skeleton self-center"></div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        /* Empty Orders */
        <div className="text-center py-16 glass rounded-3xl border border-white/5 p-8 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-300">Bạn chưa mua đơn hàng nào</h3>
          <p className="text-gray-500 text-xs mt-1">Hãy tham khảo kho Token và Tool để mua sắm ngay.</p>
        </div>
      ) : (
        /* Orders list */
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass rounded-2xl p-5 border border-white/5 hover:border-indigo-500/10 hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden"
            >
              {/* Left Column: Details */}
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-slate-100 font-mono tracking-wide">{order.id}</span>
                  {statusTags[order.status]}
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>
                    Loại: <span className="text-slate-300 font-bold">{order.type === 'TOKEN' ? `Mua ${order.quantity.toLocaleString()} Token` : `Mua Tool "${order.tool ? order.tool.name : 'Không rõ'}"`}</span>
                  </p>
                  <p>Nội dung CK: <span className="font-mono text-indigo-400 font-semibold">{order.transferMessage}</span></p>
                  <p>Thời gian: <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span></p>
                </div>
              </div>

              {/* Right Column: Price and Action */}
              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                <div>
                  <span className="text-gray-500 text-[10px] block uppercase text-right">Tổng tiền</span>
                  <span className="text-indigo-400 font-extrabold text-sm text-right block">
                    {order.totalAmount.toLocaleString()} VNĐ
                  </span>
                </div>

                {order.status === 'APPROVED' ? (
                  <a
                    href={`${API_URL}/orders/${order.id}/download?token=${token}`} // include token in query if direct link download, or fetch via download endpoint
                    onClick={(e) => {
                      e.preventDefault();
                      // Open secure download url in same window or download
                      window.open(`${API_URL}/orders/${order.id}/download?token=${token}`, '_blank');
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 px-4 text-xs font-bold shadow-md shadow-emerald-500/15 flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file
                  </a>
                ) : order.status === 'PENDING' ? (
                  <button
                    onClick={() => handleRepay(order)}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-xl py-2 px-4 text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Thanh toán
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 bg-white/5 border border-white/5 px-3 py-2 rounded-xl flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Hủy bỏ
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repay Modal */}
      {activePaymentOrder && (
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
                <h3 className="font-extrabold text-lg text-white">Thanh Toán Lại Đơn Hàng</h3>
                <p className="text-xs text-gray-400 mt-0.5">Mã đơn: <span className="font-mono text-indigo-400 font-semibold">{activePaymentOrder.order.id}</span></p>
              </div>
              <button
                onClick={() => setActivePaymentOrder(null)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-6 flex flex-col md:flex-row gap-6 items-center">
              {/* QR Code */}
              <div className="w-full md:w-1/2 flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img
                    src={activePaymentOrder.qrUrl}
                    alt="VietQR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Đang đợi duyệt hệ thống...
                </span>
              </div>

              {/* Bank Details */}
              <div className="w-full md:w-1/2 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Ngân hàng</span>
                    <span className="text-slate-100 font-bold">{activePaymentOrder.bankDetails.bankName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Số tài khoản</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-100 font-bold font-mono">{activePaymentOrder.bankDetails.accountNo}</span>
                      <button onClick={() => copyToClipboard(activePaymentOrder.bankDetails.accountNo, 'Số tài khoản')} className="text-indigo-400">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Số tiền cần chuyển</span>
                    <span className="text-indigo-400 font-extrabold">{activePaymentOrder.bankDetails.amount.toLocaleString()} VNĐ</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Nội dung chuyển khoản</span>
                    <div className="flex items-center justify-between p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mt-1">
                      <span className="text-indigo-300 font-extrabold font-mono">{activePaymentOrder.bankDetails.message}</span>
                      <button onClick={() => copyToClipboard(activePaymentOrder.bankDetails.message, 'Nội dung')} className="text-indigo-400">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
