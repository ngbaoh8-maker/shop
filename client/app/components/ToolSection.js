'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { Terminal, Cpu, Clock, CheckCircle, Download, Copy, X } from 'lucide-react';

const API_URL = '/api';

export default function ToolSection({ token }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState(null);
  const [orderStatus, setOrderStatus] = useState('PENDING');
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  const toast = useToast();
  const pollInterval = useRef(null);

  // Fetch tools list
  const fetchTools = async () => {
    try {
      const res = await axios.get(`${API_URL}/tools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTools(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách sản phẩm Tool.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [token]);

  // Handle Buy Tool Click
  const handleBuyTool = async (toolId) => {
    try {
      const res = await axios.post(
        `${API_URL}/orders/tool`,
        { toolId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCheckoutData(res.data);
      setOrderStatus('PENDING');
      toast.success('Đơn hàng đã được tạo. Vui lòng thanh toán qua QR.');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể tạo đơn hàng.');
    }
  };

  // Poll for payment status
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
          <Terminal className="w-7 h-7 text-indigo-400" />
          Kho Phần Mềm & Tool Bản Quyền
        </h2>
        <p className="text-gray-400 text-sm mt-1">Các công cụ hỗ trợ công việc, tự động hóa chất lượng cao.</p>
      </div>

      {loading ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl skeleton"></div>
              <div className="h-6 w-3/4 rounded-md skeleton"></div>
              <div className="h-4 w-5/6 rounded-md skeleton"></div>
              <div className="h-10 w-full rounded-2xl skeleton mt-4"></div>
            </div>
          ))}
        </div>
      ) : tools.length === 0 ? (
        /* Empty Store */
        <div className="text-center py-12 glass rounded-3xl border border-white/5 p-8 max-w-md mx-auto">
          <Cpu className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="font-bold text-slate-300">Chưa có sản phẩm Tool nào</h3>
          <p className="text-gray-500 text-xs mt-1">Quản trị viên đang cập nhật sản phẩm. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="glass rounded-3xl p-6 border border-white/5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-300 hover:border-indigo-500/20 hover:shadow-indigo-500/5 group"
            >
              {/* Blur accent */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>

              <div className="space-y-3">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400 inline-block">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-gray-400 text-xs leading-relaxed min-h-[40px] whitespace-pre-line">
                  {tool.description || 'Không có ghi chú thêm cho sản phẩm này.'}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                  <span className="text-gray-500 text-xs">Giá sản phẩm</span>
                  <span className="text-indigo-400 font-extrabold text-lg">
                    {tool.price.toLocaleString()} VNĐ
                  </span>
                </div>
                
                <button
                  onClick={() => handleBuyTool(tool.id)}
                  className="w-full bg-slate-800 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 text-white rounded-2xl py-3 px-4 text-xs font-semibold border border-white/5 hover:border-transparent transition-all duration-300 cursor-pointer"
                >
                  Mua Ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <h3 className="font-extrabold text-lg text-white">Thanh Toán Mua Tool</h3>
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
                    Tải File Tool Ngay
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
