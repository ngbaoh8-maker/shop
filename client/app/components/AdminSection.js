'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './Toast';
import { 
  BarChart3, Users, Terminal, Database, FileSpreadsheet, 
  Trash2, Lock, Unlock, ShieldAlert, Upload, Check, XCircle, Plus, Eye 
} from 'lucide-react';

const API_URL = '/api';

export default function AdminSection({ token, userRole }) {
  const [activeSubTab, setActiveSubTab] = useState('stats');
  
  // States
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tools, setTools] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolPrice, setToolPrice] = useState('');
  const [toolFile, setToolFile] = useState(null);
  const [toolSubmitting, setToolSubmitting] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [userSubmitting, setUserSubmitting] = useState(false);

  // File approval states
  const [approvingOrderId, setApprovingOrderId] = useState(null);
  const [tokenUploadFile, setTokenUploadFile] = useState(null);
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  const toast = useToast();
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'stats') {
        const res = await axios.get(`${API_URL}/admin/stats`, { headers });
        setStats(res.data);
      } else if (activeSubTab === 'orders') {
        const res = await axios.get(`${API_URL}/orders/all`, { headers });
        setOrders(res.data);
      } else if (activeSubTab === 'tools') {
        const res = await axios.get(`${API_URL}/tools`, { headers });
        setTools(res.data);
      } else if (activeSubTab === 'users' && userRole === 'SUPER_ADMIN') {
        const res = await axios.get(`${API_URL}/admin/users`, { headers });
        setUsers(res.data);
      } else if (activeSubTab === 'logs') {
        const res = await axios.get(`${API_URL}/admin/logs`, { headers });
        setLogs(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể lấy dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  // Create Tool
  const handleCreateTool = async (e) => {
    e.preventDefault();
    if (!toolName || !toolPrice || !toolFile) {
      toast.error('Vui lòng điền đầy đủ và đính kèm file Tool.');
      return;
    }

    setToolSubmitting(true);
    const formData = new FormData();
    formData.append('name', toolName);
    formData.append('description', toolDesc);
    formData.append('price', toolPrice);
    formData.append('toolFile', toolFile);

    try {
      await axios.post(`${API_URL}/tools`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Đăng Tool mới thành công!');
      setToolName('');
      setToolDesc('');
      setToolPrice('');
      setToolFile(null);
      // Reset input element value
      const fileInput = document.getElementById('tool-file-input');
      if (fileInput) fileInput.value = '';
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Lỗi đăng Tool.');
    } finally {
      setToolSubmitting(false);
    }
  };

  // Delete Tool
  const handleDeleteTool = async (toolId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Tool này khỏi kho lưu trữ?')) return;
    try {
      await axios.delete(`${API_URL}/tools/${toolId}`, { headers });
      toast.success('Xóa Tool thành công.');
      fetchData();
    } catch (err) {
      toast.error('Lỗi khi xóa Tool.');
    }
  };

  // Create Admin/User (Super Admin only)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast.error('Vui lòng điền đầy đủ tài khoản mật khẩu.');
      return;
    }

    setUserSubmitting(true);
    try {
      await axios.post(`${API_URL}/admin/users`, {
        username: newUsername,
        password: newPassword,
        role: newUserRole
      }, { headers });
      toast.success('Tạo tài khoản quản trị thành công.');
      setNewUsername('');
      setNewPassword('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo tài khoản.');
    } finally {
      setUserSubmitting(false);
    }
  };

  // Toggle Lock User (Super Admin only)
  const handleToggleLockUser = async (userId) => {
    try {
      const res = await axios.post(`${API_URL}/admin/users/${userId}/toggle-lock`, {}, { headers });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error('Không thể thao tác khóa tài khoản.');
    }
  };

  // Change Role User (Super Admin only)
  const handleChangeRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'USER' ? 'ADMIN' : 'USER';
    if (!window.confirm(`Thay đổi quyền thành ${nextRole}?`)) return;
    try {
      await axios.post(`${API_URL}/admin/users/${userId}/role`, { role: nextRole }, { headers });
      toast.success('Thay đổi vai trò thành công.');
      fetchData();
    } catch (err) {
      toast.error('Không thể thay đổi vai trò.');
    }
  };

  // Delete User (Super Admin only)
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('XÓA HOÀN TOÀN tài khoản và các đơn hàng liên quan? Hành động này không thể hoàn tác.')) return;
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, { headers });
      toast.success('Xóa tài khoản thành công.');
      fetchData();
    } catch (err) {
      toast.error('Không thể xóa tài khoản.');
    }
  };

  // Reject Order
  const handleRejectOrder = async (orderId) => {
    if (!window.confirm('Từ chối giao dịch này?')) return;
    try {
      await axios.post(`${API_URL}/orders/${orderId}/reject-web`, {}, { headers });
      toast.success('Đã từ chối đơn hàng.');
      fetchData();
    } catch (err) {
      toast.error('Không thể từ chối đơn hàng.');
    }
  };

  // Approve Order Web (Tool: instant, Token: requires file)
  const handleApproveOrder = async (order) => {
    if (order.type === 'TOOL') {
      if (!window.confirm(`Xác nhận duyệt đơn hàng mua Tool cho ${order.id}?`)) return;
      try {
        await axios.post(`${API_URL}/orders/${order.id}/approve-web`, {}, { headers });
        toast.success('Duyệt đơn Tool thành công.');
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Lỗi duyệt đơn.');
      }
    } else {
      // Trigger token upload view
      setApprovingOrderId(order.id);
      setTokenUploadFile(null);
    }
  };

  const handleTokenApproveSubmit = async (e) => {
    e.preventDefault();
    if (!tokenUploadFile) {
      toast.error('Vui lòng chọn file TXT chứa danh sách Token.');
      return;
    }

    setApproveSubmitting(true);
    const formData = new FormData();
    formData.append('tokenFile', tokenUploadFile);

    try {
      await axios.post(`${API_URL}/orders/${approvingOrderId}/approve-web`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Duyệt và gắn file Token thành công!');
      setApprovingOrderId(null);
      setTokenUploadFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt đơn hàng Token.');
    } finally {
      setApproveSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs nav */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${activeSubTab === 'stats' ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-300'}`}
        >
          Thống kê
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${activeSubTab === 'orders' ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-300'}`}
        >
          Duyệt đơn hàng
        </button>
        <button
          onClick={() => setActiveSubTab('tools')}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${activeSubTab === 'tools' ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-300'}`}
        >
          Đăng Tool mới
        </button>
        {userRole === 'SUPER_ADMIN' && (
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${activeSubTab === 'users' ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-300'}`}
          >
            Quản trị viên
          </button>
        )}
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${activeSubTab === 'logs' ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-slate-300'}`}
        >
          Nhật ký hoạt động
        </button>
      </div>

      {loading && activeSubTab !== 'tools' && (
        <div className="py-12 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && activeSubTab === 'stats' && stats && (
        /* STATS VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng doanh thu</span>
              <p className="text-xl font-extrabold text-indigo-400">{stats.metrics.totalRevenue.toLocaleString()} VNĐ</p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Khách hàng</span>
              <p className="text-xl font-extrabold text-white">{stats.metrics.totalUsers}</p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tổng số Tool</span>
              <p className="text-xl font-extrabold text-white">{stats.metrics.totalTools}</p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Đơn hàng đợi duyệt</span>
              <p className="text-xl font-extrabold text-amber-400">{stats.metrics.pendingOrdersCount}</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/5">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Chi tiết phân bổ doanh thu
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Từ Token</span>
                  <span className="font-semibold text-slate-200">{stats.breakdown.tokenRevenue.toLocaleString()} VNĐ</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${stats.metrics.totalRevenue > 0 ? (stats.breakdown.tokenRevenue / stats.metrics.totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Từ Tool</span>
                  <span className="font-semibold text-slate-200">{stats.breakdown.toolRevenue.toLocaleString()} VNĐ</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full" 
                    style={{ width: `${stats.metrics.totalRevenue > 0 ? (stats.breakdown.toolRevenue / stats.metrics.totalRevenue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && activeSubTab === 'orders' && (
        /* ORDERS MANAGEMENT */
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-center py-6 text-xs text-gray-500">Chưa có đơn hàng nào.</p>
          ) : (
            <div className="overflow-x-auto glass rounded-2xl border border-white/5">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 bg-slate-950/40">
                    <th className="p-4">Mã Đơn</th>
                    <th className="p-4">Khách Hàng</th>
                    <th className="p-4">Loại</th>
                    <th className="p-4">Nội Dung CK</th>
                    <th className="p-4">Số Tiền</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-100">{o.id}</td>
                      <td className="p-4">{o.user?.username}</td>
                      <td className="p-4">
                        {o.type === 'TOKEN' ? `${o.quantity} Token` : `Tool "${o.tool?.name || 'Không rõ'}"`}
                      </td>
                      <td className="p-4 font-mono text-indigo-400">{o.transferMessage}</td>
                      <td className="p-4 font-bold text-slate-200">{o.totalAmount.toLocaleString()} VNĐ</td>
                      <td className="p-4">
                        {o.status === 'PENDING' && <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">Đợi duyệt</span>}
                        {o.status === 'APPROVED' && <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Đã duyệt</span>}
                        {o.status === 'REJECTED' && <span className="text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/10">Từ chối</span>}
                      </td>
                      <td className="p-4">
                        {o.status === 'PENDING' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApproveOrder(o)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-1.5 transition-colors cursor-pointer"
                              title="Duyệt đơn hàng"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRejectOrder(o.id)}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5 transition-colors cursor-pointer"
                              title="Từ chối đơn hàng"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 block text-center">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'tools' && (
        /* TOOLS CREATION & MANAGEMENT */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add form */}
          <div className="lg:col-span-1 glass rounded-2xl p-6 border border-white/5 space-y-4 h-fit">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Đăng bán Tool mới
            </h3>
            <form onSubmit={handleCreateTool} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Tên Tool</label>
                <input
                  type="text"
                  placeholder="Nhập tên phần mềm"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Mô tả chi tiết / Ghi chú</label>
                <textarea
                  rows="3"
                  placeholder="Nhập tính năng hoặc ghi chú sử dụng..."
                  value={toolDesc}
                  onChange={(e) => setToolDesc(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
                ></textarea>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Giá bán (VNĐ)</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 50000"
                  value={toolPrice}
                  onChange={(e) => setToolPrice(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">File phần mềm</label>
                <input
                  type="file"
                  id="tool-file-input"
                  onChange={(e) => setToolFile(e.target.files[0])}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-300 hover:file:bg-indigo-500/20 file:cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                disabled={toolSubmitting}
              >
                {toolSubmitting ? 'Đang xử lý...' : 'Đăng Sản Phẩm'}
              </button>
            </form>
          </div>

          {/* Tools List */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-100">Các Tool đang hiển thị</h3>
            {loading ? (
              <div className="py-6 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : tools.length === 0 ? (
              <p className="text-xs text-gray-500">Chưa đăng bán sản phẩm Tool nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tools.map((t) => (
                  <div key={t.id} className="glass rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{t.name}</h4>
                      <p className="text-gray-400 text-[10px] mt-1 line-clamp-2">{t.description || 'Không mô tả.'}</p>
                      <p className="text-[10px] font-mono text-gray-500 mt-2 truncate">File: {t.fileUrl}</p>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-3">
                      <span className="text-indigo-400 font-extrabold text-xs">{t.price.toLocaleString()} VNĐ</span>
                      <button
                        onClick={() => handleDeleteTool(t.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && activeSubTab === 'users' && userRole === 'SUPER_ADMIN' && (
        /* USERS MANAGEMENT (SUPER ADMIN ONLY) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create user */}
          <div className="lg:col-span-1 glass rounded-2xl p-6 border border-white/5 space-y-4 h-fit">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Tạo tài khoản Admin
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Tên đăng nhập</label>
                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Mật khẩu</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Vai trò quyền</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/5 rounded-xl py-2.5 px-4 text-xs text-white outline-none focus:border-indigo-500/50"
                >
                  <option value="ADMIN">Quản Trị Viên (Admin)</option>
                  <option value="USER">Khách Hàng (User)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                disabled={userSubmitting}
              >
                {userSubmitting ? 'Đang xử lý...' : 'Tạo Tài Khoản'}
              </button>
            </form>
          </div>

          {/* List Users */}
          <div className="lg:col-span-2 overflow-x-auto glass rounded-2xl border border-white/5 h-fit">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 bg-slate-950/40">
                  <th className="p-4">Tài khoản</th>
                  <th className="p-4">Quyền</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Ngày tạo</th>
                  <th className="p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-slate-100">{u.username}</td>
                    <td className="p-4">
                      <button 
                        onClick={() => u.role !== 'SUPER_ADMIN' && handleChangeRole(u.id, u.role)}
                        className={`font-semibold cursor-pointer ${u.role === 'SUPER_ADMIN' ? 'text-purple-400' : u.role === 'ADMIN' ? 'text-indigo-400 hover:underline' : 'text-emerald-400 hover:underline'}`}
                        disabled={u.role === 'SUPER_ADMIN'}
                      >
                        {u.role}
                      </button>
                    </td>
                    <td className="p-4">
                      {u.status === 'ACTIVE' ? (
                        <span className="text-emerald-400">Đang hoạt động</span>
                      ) : (
                        <span className="text-red-400">Bị khóa</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-4">
                      {u.role !== 'SUPER_ADMIN' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleLockUser(u.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${u.status === 'ACTIVE' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}
                            title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 block text-center">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeSubTab === 'logs' && (
        /* LOGS VIEW */
        <div className="glass rounded-2xl border border-white/5 p-4 max-h-[500px] overflow-y-auto font-mono text-[11px] text-indigo-300 space-y-2">
          {logs.length === 0 ? (
            <p className="text-center py-6 text-gray-500">Chưa ghi nhận hoạt động nào.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="py-1 border-b border-white/5 flex flex-col sm:flex-row gap-2 justify-between">
                <div>
                  <span className="text-gray-500">[{new Date(l.createdAt).toLocaleString('vi-VN')}]</span>{' '}
                  <span className="text-slate-100 font-bold">{l.action}</span> - <span>{l.details}</span>
                </div>
                {l.user && <div className="text-indigo-400 text-right">User: {l.user.username}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Token file Modal */}
      {approvingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md glass rounded-3xl p-6 border border-white/10 shadow-2xl relative"
            style={{
              animation: 'panelOpen 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
              <h3 className="font-extrabold text-sm text-white">Tải Lên File Token</h3>
              <button
                onClick={() => setApprovingOrderId(null)}
                className="text-gray-400 hover:text-white rounded-full p-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTokenApproveSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-gray-400 space-y-1">
                <p>Đơn hàng: <span className="font-mono text-indigo-400 font-bold">{approvingOrderId}</span></p>
                <p>Vui lòng chuẩn bị tệp tin `.txt` chứa danh sách các token tương ứng.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Chọn file (.TXT)</label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => setTokenUploadFile(e.target.files[0])}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-300 hover:file:bg-indigo-500/20 file:cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                disabled={approveSubmitting}
              >
                <Upload className="w-4 h-4" />
                {approveSubmitting ? 'Đang tải lên...' : 'Duyệt Đơn Hàng'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
