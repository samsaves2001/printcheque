import React, { useState } from 'react';
import {
  Save,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  CheckCircle2,
  Info,
  Database,
} from 'lucide-react';
import { AppSettings, BankConfig, CalibrationProfile, FullBackupData } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  banks: BankConfig[];
  calibrations: CalibrationProfile[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onExportBackup: () => Promise<FullBackupData>;
  onImportBackup: (backup: FullBackupData, mode: 'merge' | 'replace') => Promise<void>;
  onClearDatabase: () => Promise<void>;
  onResetSampleData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  banks,
  calibrations,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
  onClearDatabase,
  onResetSampleData,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [pendingBackupData, setPendingBackupData] = useState<FullBackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('replace');

  // Clear DB Modal State
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [clearConfirmText, setClearConfirmText] = useState<string>('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setSaveSuccessMsg('Settings saved successfully.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Export JSON
  const handleExportJSON = async () => {
    const data = await onExportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-cheque-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Read Backup JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.banks && parsed.templates && parsed.cheques) {
          setPendingBackupData(parsed);
          setShowRestoreModal(true);
        } else {
          alert('Invalid backup file. Required stores (banks, templates, cheques) missing.');
        }
      } catch (err) {
        alert('Could not parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute restore
  const handleExecuteRestore = async () => {
    if (!pendingBackupData) return;
    await onImportBackup(pendingBackupData, restoreMode);
    setShowRestoreModal(false);
    setPendingBackupData(null);
    setSaveSuccessMsg('Backup restored successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Execute clear
  const handleExecuteClear = async () => {
    if (clearConfirmText !== 'DELETE') return;
    await onClearDatabase();
    setShowClearModal(false);
    setClearConfirmText('');
    setSaveSuccessMsg('All local database records cleared.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Execute reset to fresh clean start
  const handleExecuteResetSample = async () => {
    if (confirm('Reset application to a clean fresh start? This will clear all cheques and payees while preserving standard Nepali bank templates and configurations.')) {
      await onResetSampleData();
      setSaveSuccessMsg('Application reset to clean fresh start.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings & Local Data Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure application defaults, currency formatting, and manage offline IndexedDB backups.
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Local Storage Privacy & Integrity Callout */}
      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>100% Local-First Data Storage (No External Cloud Transmission)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          All your cheques, bank account numbers, payee directories, and calibration profiles are stored exclusively in your
          browser's local <strong>IndexedDB</strong> storage. No financial data is ever sent to third-party cloud servers.
        </p>
        <p className="text-xs text-amber-300 font-medium">
          <strong>Important Advisory:</strong> Clearing your browser cookies/storage or switching computers will erase local data unless you create regular JSON backups using the export button below.
        </p>
      </div>

      {/* App Preferences Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5"
      >
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          General Application Preferences
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Currency Symbol
            </label>
            <select
              value={formData.currencySymbol}
              onChange={(e) =>
                setFormData((p) => ({ ...p, currencySymbol: e.target.value as any }))
              }
              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
            >
              <option value="NPR">NPR (Nepali Rupees)</option>
              <option value="Rs.">Rs. (Rupees)</option>
              <option value="रू">रू (Devanagari Rupee)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Date Display Format
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) =>
                setFormData((p) => ({ ...p, dateFormat: e.target.value as any }))
              }
              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 04/11/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-04)</option>
              <option value="DD-MMM-YYYY">DD-MMM-YYYY (e.g. 04-Nov-2026)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Bank on Cheque Entry
            </label>
            <select
              value={formData.defaultBankId || ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, defaultBankId: e.target.value }))
              }
              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Calibration Profile
            </label>
            <select
              value={formData.defaultPrinterProfileId || ''}
              onChange={(e) =>
                setFormData((p) => ({ ...p, defaultPrinterProfileId: e.target.value }))
              }
              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
            >
              <option value="">None (0mm Offset)</option>
              {calibrations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount In Figures Prefix
            </label>
            <input
              type="text"
              value={formData.prefixSymbol}
              onChange={(e) => setFormData((p) => ({ ...p, prefixSymbol: e.target.value }))}
              placeholder="e.g. = or ***"
              className="w-full text-xs font-mono border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount In Figures Suffix
            </label>
            <input
              type="text"
              value={formData.suffixSymbol}
              onChange={(e) => setFormData((p) => ({ ...p, suffixSymbol: e.target.value }))}
              placeholder="e.g. /- or ***"
              className="w-full text-xs font-mono border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Crossing Wording
            </label>
            <input
              type="text"
              value={formData.defaultCrossingText}
              onChange={(e) =>
                setFormData((p) => ({ ...p, defaultCrossingText: e.target.value }))
              }
              placeholder="e.g. A/C PAYEE"
              className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Backup and Data Operations Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-600" />
          <span>Local Database Backup & Restore</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-slate-700" />
                <span>Export Complete JSON Backup</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Downloads a full snapshot of your banks, cheque templates, cheque history, payees, and calibration profiles to an encrypted-ready JSON file.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-xs transition-colors cursor-pointer"
            >
              Download Full Backup (.json)
            </button>
          </div>

          {/* Restore JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-slate-700" />
                <span>Restore from Backup File</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Import an existing JSON backup to recover records or migrate your office cheque settings onto a different computer.
              </p>
            </div>
            <label className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-xs text-center cursor-pointer transition-colors block">
              <span>Select Backup File...</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Danger Zone: Factory Reset & Wipe Data */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">
            Reset & Maintenance Zone
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExecuteResetSample}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset to Clean Fresh Start</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setClearConfirmText('');
                setShowClearModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Wipe All Local Database Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && pendingBackupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Restore Backup Archive</h3>
            <p className="text-xs text-slate-500 mt-1">
              Backup created on: <strong>{pendingBackupData.exportedAt || 'Unknown Date'}</strong>
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>Banks to restore: <strong>{pendingBackupData.banks?.length || 0}</strong></div>
              <div>Cheque records: <strong>{pendingBackupData.cheques?.length || 0}</strong></div>
              <div>Templates: <strong>{pendingBackupData.templates?.length || 0}</strong></div>
              <div>Payees: <strong>{pendingBackupData.payees?.length || 0}</strong></div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Restore Strategy:</label>
              <div className="space-y-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    className="text-slate-900"
                  />
                  <span><strong>Replace and Overwrite:</strong> Wipe current data and load backup</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="text-slate-900"
                  />
                  <span><strong>Merge:</strong> Keep existing records and add new entries</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
              >
                Proceed with Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-rose-200">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Database Wipe
              </h3>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              This will permanently delete all cheques, templates, and payees stored in this browser's IndexedDB.
              This operation cannot be undone.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <strong className="text-rose-600 font-mono">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full text-xs font-mono font-bold border border-slate-300 rounded px-2.5 py-2 text-rose-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearConfirmText !== 'DELETE'}
                onClick={handleExecuteClear}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-lg shadow-sm"
              >
                Permanently Wipe All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
