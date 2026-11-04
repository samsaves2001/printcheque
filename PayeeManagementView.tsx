import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  FileText,
  Printer,
  Building,
} from 'lucide-react';
import { PayeeRecord } from '../types';
import { formatNepaliCurrency } from '../utils/nepaliNumberWords';

interface PayeeManagementViewProps {
  payees: PayeeRecord[];
  onSavePayee: (payee: PayeeRecord) => Promise<void>;
  onDeletePayee: (payeeId: string) => Promise<void>;
  onIssueChequeToPayee: (payee: PayeeRecord) => void;
}

export const PayeeManagementView: React.FC<PayeeManagementViewProps> = ({
  payees,
  onSavePayee,
  onDeletePayee,
  onIssueChequeToPayee,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingPayee, setEditingPayee] = useState<PayeeRecord | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    nickname: string;
    category: PayeeRecord['category'];
    panNumber: string;
    contactNumber: string;
    defaultMemo: string;
  }>({
    name: '',
    nickname: '',
    category: 'Vendor',
    panNumber: '',
    contactNumber: '',
    defaultMemo: '',
  });

  const filteredPayees = useMemo(() => {
    return payees.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchNick = (p.nickname || '').toLowerCase().includes(q);
        const matchPan = (p.panNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchNick && !matchPan) return false;
      }
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [payees, searchTerm, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingPayee(null);
    setFormData({
      name: '',
      nickname: '',
      category: 'Vendor',
      panNumber: '',
      contactNumber: '',
      defaultMemo: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (payee: PayeeRecord) => {
    setEditingPayee(payee);
    setFormData({
      name: payee.name,
      nickname: payee.nickname || '',
      category: payee.category,
      panNumber: payee.panNumber || '',
      contactNumber: payee.contactNumber || '',
      defaultMemo: payee.defaultMemo || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payeeRecord: PayeeRecord = {
      id: editingPayee?.id || `payee-${Date.now()}`,
      name: formData.name.trim(),
      nickname: formData.nickname.trim() || formData.name.trim(),
      category: formData.category,
      panNumber: formData.panNumber.trim() || undefined,
      contactNumber: formData.contactNumber.trim() || undefined,
      defaultMemo: formData.defaultMemo.trim() || undefined,
      chequeCount: editingPayee?.chequeCount || 0,
      totalAmountIssued: editingPayee?.totalAmountIssued || 0,
      createdAt: editingPayee?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSavePayee(payeeRecord);
    setShowModal(false);
  };

  const handleDelete = async (payee: PayeeRecord) => {
    if (confirm(`Are you sure you want to delete "${payee.name}"?`)) {
      await onDeletePayee(payee.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payee Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Store recurring payees, tax identification (PAN), and default accounting memos.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Payee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Payee name, alias, or PAN number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
          >
            <option value="all">All Categories</option>
            <option value="Vendor">Vendor</option>
            <option value="Salary">Salary</option>
            <option value="Tax / Government">Tax / Government</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Contractor">Contractor</option>
            <option value="Personal">Personal</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Payee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPayees.map((payee) => (
          <div
            key={payee.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{payee.name}</h2>
                  {payee.nickname && payee.nickname !== payee.name && (
                    <span className="text-[11px] text-slate-500">{payee.nickname}</span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                  {payee.category}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {payee.panNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">PAN:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {payee.panNumber}
                    </span>
                  </div>
                )}
                {payee.contactNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="text-slate-700">{payee.contactNumber}</span>
                  </div>
                )}
                {payee.defaultMemo && (
                  <div className="text-[11px] text-slate-500 italic truncate pt-1">
                    "{payee.defaultMemo}"
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onIssueChequeToPayee(payee)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Write Cheque</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(payee)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                  title="Edit Payee"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(payee)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                  title="Delete Payee"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Payee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {editingPayee ? 'Edit Payee Information' : 'Add New Payee'}
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Payee Name (printed on cheque) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nepal Electricity Authority"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alias / Nickname (internal display)
                </label>
                <input
                  type="text"
                  placeholder="e.g. NEA Central"
                  value={formData.nickname}
                  onChange={(e) => setFormData((p) => ({ ...p, nickname: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        category: e.target.value as PayeeRecord['category'],
                      }))
                    }
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
                  >
                    <option value="Vendor">Vendor</option>
                    <option value="Salary">Salary</option>
                    <option value="Tax / Government">Tax / Government</option>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    placeholder="9-digit PAN"
                    value={formData.panNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, panNumber: e.target.value }))}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +977-1-4153051"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, contactNumber: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Accounting Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Electricity Bill"
                  value={formData.defaultMemo}
                  onChange={(e) => setFormData((p) => ({ ...p, defaultMemo: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save Payee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
