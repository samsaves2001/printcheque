import React, { useState } from 'react';
import {
  Sliders,
  Printer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Star,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { BankConfig, ChequeTemplate, CalibrationProfile } from '../types';

interface CalibrationViewProps {
  banks: BankConfig[];
  templates: ChequeTemplate[];
  calibrations: CalibrationProfile[];
  defaultCalibrationId?: string;
  onSaveCalibration: (profile: CalibrationProfile) => Promise<void>;
  onDeleteCalibration: (profileId: string) => Promise<void>;
  onSetDefaultCalibration: (profileId: string) => Promise<void>;
  onPrintTestAlignmentSheet: (
    bank: BankConfig,
    template: ChequeTemplate,
    calibration: CalibrationProfile | null
  ) => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  banks,
  templates,
  calibrations,
  defaultCalibrationId,
  onSaveCalibration,
  onDeleteCalibration,
  onSetDefaultCalibration,
  onPrintTestAlignmentSheet,
}) => {
  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<CalibrationProfile | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    printerName: string;
    bankId: string;
    offsetX: number;
    offsetY: number;
    feedOrientation: 'landscape' | 'portrait-rot90';
    trayAlignment: 'left' | 'center' | 'right';
    notes: string;
  }>({
    name: '',
    printerName: '',
    bankId: 'all',
    offsetX: 0,
    offsetY: 0,
    feedOrientation: 'landscape',
    trayAlignment: 'center',
    notes: '',
  });

  const selectedBank = banks.find((b) => b.id === selectedBankId) || banks[0];
  const selectedTemplate =
    templates.find((t) => t.bankId === selectedBank?.id) || templates[0];

  const handleOpenAdd = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      printerName: 'Standard Desk Printer (HP / Epson / Canon / Brother)',
      bankId: selectedBankId,
      offsetX: 0,
      offsetY: 0,
      feedOrientation: 'landscape',
      trayAlignment: 'center',
      notes: '',
    });
    setShowProfileModal(true);
  };

  const handleOpenEdit = (profile: CalibrationProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      printerName: profile.printerName,
      bankId: profile.bankId,
      offsetX: profile.offsetX,
      offsetY: profile.offsetY,
      feedOrientation: profile.feedOrientation || 'landscape',
      trayAlignment: profile.trayAlignment || 'center',
      notes: profile.notes || '',
    });
    setShowProfileModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const profile: CalibrationProfile = {
      id: editingProfile?.id || `calib-${Date.now()}`,
      name: formData.name.trim(),
      printerName: formData.printerName.trim(),
      bankId: formData.bankId,
      offsetX: parseFloat(formData.offsetX.toString()) || 0,
      offsetY: parseFloat(formData.offsetY.toString()) || 0,
      feedOrientation: formData.feedOrientation,
      trayAlignment: formData.trayAlignment,
      notes: formData.notes.trim() || undefined,
      createdAt: editingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveCalibration(profile);
    setShowProfileModal(false);
  };

  const handleDelete = async (profile: CalibrationProfile) => {
    if (confirm(`Delete calibration profile "${profile.name}"?`)) {
      await onDeleteCalibration(profile.id);
    }
  };

  const handleTestPrint = (profile?: CalibrationProfile) => {
    if (!selectedBank || !selectedTemplate) {
      alert('Please configure at least one bank before running calibration test.');
      return;
    }
    onPrintTestAlignmentSheet(selectedBank, selectedTemplate, profile || null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Printer Calibration Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Eliminate mechanical roller paper feed discrepancies with precision horizontal and vertical offsets.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Calibration Profile</span>
        </button>
      </div>

      {/* 4-Step Interactive Calibration Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-slate-600" />
          <span>Physical Alignment Procedure</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Step 1 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Target Bank</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Select the bank whose physical cheque leaf dimensions you want to verify:
            </p>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-800"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.widthMm}×{b.heightMm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Print Test Sheet</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Feed ordinary plain paper into your printer tray and click below:
            </p>
            <button
              type="button"
              onClick={() => handleTestPrint()}
              className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Test Sheet</span>
            </button>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Compare Alignment</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Lay the printed test sheet directly over an actual blank cheque leaf against a window or desk light.
              Observe where the sample boxes fall relative to the pre-printed lines.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                4
              </span>
              <span>Adjust & Save</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Measure any shift with an office ruler.
              <br />
              • If text is too far <strong>Right</strong>: enter negative X (-mm).
              <br />
              • If text is too far <strong>Low</strong>: enter negative Y (-mm).
            </p>
          </div>
        </div>
      </div>

      {/* Calibration Profiles List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
          <span>Configured Printer Calibration Profiles</span>
          <span className="text-xs font-normal text-slate-400">
            {calibrations.length} profile(s) saved in local storage
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calibrations.map((profile) => {
            const isDefault = profile.id === defaultCalibrationId;
            const bank = banks.find((b) => b.id === profile.bankId);

            return (
              <div
                key={profile.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isDefault
                    ? 'border-slate-800 ring-1 ring-slate-800 bg-slate-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{profile.name}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Printer: <strong>{profile.printerName}</strong>
                      </div>
                    </div>
                    {isDefault && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        Active Default
                      </span>
                    )}
                  </div>

                  {/* Offsets & Feed Orientation Display */}
                  <div className="mt-3 grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">
                        Horizontal Shift (X):
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {profile.offsetX >= 0 ? `+${profile.offsetX}` : profile.offsetX} mm
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">
                        Vertical Shift (Y):
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {profile.offsetY >= 0 ? `+${profile.offsetY}` : profile.offsetY} mm
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] gap-2">
                    <span className="text-slate-500">Printer Feed:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      profile.feedOrientation === 'portrait-rot90'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {profile.feedOrientation === 'portrait-rot90'
                        ? 'Vertical Envelope (76mm, 90°)'
                        : 'Landscape (203mm Wide)'}
                    </span>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-500 flex justify-between">
                    <span>Applicable to:</span>
                    <span className="font-semibold text-slate-700">
                      {profile.bankId === 'all' ? 'All Banks' : bank?.name || profile.bankId}
                    </span>
                  </div>

                  {profile.notes && (
                    <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                      "{profile.notes}"
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleTestPrint(profile)}
                    className="font-semibold text-slate-800 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Test with this Profile</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => onSetDefaultCalibration(profile.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                        title="Set as Default Calibration"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(profile)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(profile)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingProfile ? 'Edit Calibration Profile' : 'New Calibration Profile'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Store fine adjustments in millimetres and feed orientation for this printer and bank pairing.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prabhu Bank - HP LaserJet Manual Tray"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Printer Model / Hardware Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HP LaserJet Pro M404n / Epson EcoTank L3250"
                  value={formData.printerName}
                  onChange={(e) => setFormData((p) => ({ ...p, printerName: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Bank
                </label>
                <select
                  value={formData.bankId}
                  onChange={(e) => setFormData((p) => ({ ...p, bankId: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
                >
                  <option value="all">All Banks (Universal Offset)</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feed Orientation & Tray Alignment for Normal Desk Printers */}
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Printer className="w-3.5 h-3.5 text-amber-700" />
                  <span>Normal Office Desk Printer Feed Settings</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Feed Orientation
                  </label>
                  <select
                    value={formData.feedOrientation}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        feedOrientation: e.target.value as 'landscape' | 'portrait-rot90',
                      }))
                    }
                    className="w-full text-xs border border-amber-300 rounded px-2.5 py-1.5 bg-white text-slate-900 font-medium"
                  >
                    <option value="landscape">
                      Landscape (203mm wide edge first - wide manual tray)
                    </option>
                    <option value="portrait-rot90">
                      Portrait / Envelope Feed (76mm short edge first, 90° rotated)
                    </option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Select <strong>Portrait / Envelope</strong> if your printer's manual paper guides slide inwards to grip 76mm narrow cheques.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Manual Tray Guides Alignment
                  </label>
                  <select
                    value={formData.trayAlignment}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        trayAlignment: e.target.value as 'left' | 'center' | 'right',
                      }))
                    }
                    className="w-full text-xs border border-amber-300 rounded px-2.5 py-1.5 bg-white text-slate-900 font-medium"
                  >
                    <option value="center">Center-fed (both guide sliders move symmetrically - most HP/Epson)</option>
                    <option value="left">Left-aligned guide (fixed left edge, right slider moves)</option>
                    <option value="right">Right-aligned guide</option>
                  </select>
                </div>
              </div>

              {/* Offset Adjustments */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Horizontal Shift (X, mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="-25"
                    max="25"
                    value={formData.offsetX}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, offsetX: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    (+) Moves Right, (-) Moves Left
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Vertical Shift (Y, mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="-25"
                    max="25"
                    value={formData.offsetY}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, offsetY: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    (+) Moves Down, (-) Moves Up
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Paper Guide Setting
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Set manual paper guide clamp to 76mm snug"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
