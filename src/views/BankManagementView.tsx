import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
  Layers,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { BankConfig, ChequeTemplate } from '../types';
import { createStandardTemplate } from '../utils/defaultData';

interface BankManagementViewProps {
  banks: BankConfig[];
  templates: ChequeTemplate[];
  onSaveBank: (bank: BankConfig) => Promise<void>;
  onDeleteBank: (bankId: string) => Promise<void>;
  onSetDefaultBank: (bankId: string) => Promise<void>;
  onNavigateToTemplates: (bankId: string) => void;
}

export const BankManagementView: React.FC<BankManagementViewProps> = ({
  banks,
  templates,
  onSaveBank,
  onDeleteBank,
  onSetDefaultBank,
  onNavigateToTemplates,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBank, setEditingBank] = useState<BankConfig | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    shortName: string;
    branch: string;
    accountHolderName: string;
    accountNumber: string;
    widthMm: number;
    heightMm: number;
    primaryColor: string;
    isDefault: boolean;
  }>({
    name: '',
    shortName: '',
    branch: '',
    accountHolderName: '',
    accountNumber: '',
    widthMm: 203,
    heightMm: 76,
    primaryColor: '#0f172a',
    isDefault: false,
  });

  const handleOpenAdd = () => {
    setEditingBank(null);
    setFormData({
      name: '',
      shortName: '',
      branch: '',
      accountHolderName: 'Apex Accounting Services Pvt. Ltd.',
      accountNumber: '',
      widthMm: 203,
      heightMm: 76,
      primaryColor: '#0f172a',
      isDefault: banks.length === 0,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (bank: BankConfig) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      shortName: bank.shortName,
      branch: bank.branch || '',
      accountHolderName: bank.accountHolderName || '',
      accountNumber: bank.accountNumber || '',
      widthMm: bank.widthMm,
      heightMm: bank.heightMm,
      primaryColor: bank.primaryColor || '#0f172a',
      isDefault: !!bank.isDefault,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const bankId = editingBank?.id || `bank-${Date.now()}`;
    const bankRecord: BankConfig = {
      id: bankId,
      name: formData.name.trim(),
      shortName: formData.shortName.trim() || formData.name.trim(),
      branch: formData.branch.trim(),
      accountHolderName: formData.accountHolderName.trim(),
      accountNumber: formData.accountNumber.trim(),
      widthMm: parseFloat(formData.widthMm.toString()) || 203,
      heightMm: parseFloat(formData.heightMm.toString()) || 76,
      primaryColor: formData.primaryColor,
      isDefault: formData.isDefault,
      defaultTemplateId: editingBank?.defaultTemplateId || `tmpl-${bankId}-std`,
      createdAt: editingBank?.createdAt || new Date().toISOString(),
    };

    await onSaveBank(bankRecord);
    setShowModal(false);
  };

  const handleDelete = async (bank: BankConfig) => {
    if (confirm(`Are you sure you want to delete "${bank.name}" and all associated cheque templates?`)) {
      await onDeleteBank(bank.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bank Accounts & Leaf Configurations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage multiple Nepali commercial banks. Each bank holds independent physical cheque dimensions and coordinate settings.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Bank Account</span>
        </button>
      </div>

      {/* Bank Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {banks.map((bank) => {
          const bankTemplates = templates.filter((t) => t.bankId === bank.id);
          return (
            <div
              key={bank.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                bank.isDefault ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Bank Header Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: bank.primaryColor || '#0f172a' }}
                    />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 leading-snug">
                        {bank.name}
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {bank.shortName}
                      </span>
                    </div>
                  </div>

                  {bank.isDefault && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded shrink-0">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      Default
                    </span>
                  )}
                </div>

                {/* Account Details */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Cheque Dimensions:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {bank.widthMm}mm × {bank.heightMm}mm
                    </span>
                  </div>

                  {bank.accountNumber && (
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-mono font-semibold text-slate-800 truncate max-w-[170px]">
                        {bank.accountNumber}
                      </span>
                    </div>
                  )}

                  {bank.branch && (
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Branch:</span>
                      <span className="text-slate-800 truncate max-w-[180px]">
                        {bank.branch}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400">Active Templates:</span>
                    <span className="font-semibold text-slate-800">
                      {bankTemplates.length} configured
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTemplates(bank.id)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Layout</span>
                </button>

                <div className="flex items-center gap-1">
                  {!bank.isDefault && (
                    <button
                      type="button"
                      onClick={() => onSetDefaultBank(bank.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                      title="Set as Default Bank"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(bank)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                    title="Edit Bank Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(bank)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                    title="Delete Bank"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Bank Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {editingBank ? 'Edit Bank Account & Cheque Size' : 'Add Nepali Bank Configuration'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter the exact physical cheque dimensions in millimetres as measured with an office ruler.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nabil Bank Limited"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nabil Bank"
                    value={formData.shortName}
                    onChange={(e) => setFormData((p) => ({ ...p, shortName: e.target.value }))}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand Color Indicator
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">{formData.primaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Dimensions: Width and Height in mm */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Cheque Leaf Width (mm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="150"
                    max="260"
                    required
                    value={formData.widthMm}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, widthMm: parseFloat(e.target.value) || 203 }))
                    }
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Standard Nepali: ~203mm</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Cheque Leaf Height (mm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="60"
                    max="110"
                    required
                    value={formData.heightMm}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, heightMm: parseFloat(e.target.value) || 76 }))
                    }
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Standard Nepali: ~76mm</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 01100175029481"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, accountNumber: e.target.value }))}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Teendhara Marg, Kathmandu"
                    value={formData.branch}
                    onChange={(e) => setFormData((p) => ({ ...p, branch: e.target.value }))}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Holder Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Accounting Services Pvt. Ltd."
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData((p) => ({ ...p, accountHolderName: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData((p) => ({ ...p, isDefault: e.target.checked }))}
                    className="w-4 h-4 rounded text-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Set as Default Bank for new cheques
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
                  {editingBank ? 'Save Bank Changes' : 'Create Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
