import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Printer,
  History,
  Building2,
  Sliders,
  Users,
  Compass,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  Shield,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  BankConfig,
  ChequeTemplate,
  ChequeRecord,
  PayeeRecord,
  CalibrationProfile,
  AppSettings,
  FullBackupData,
  ChequeStatus,
} from './types';
import { dbService } from './db/indexedDB';
import { PhysicalPrintStage, PrintData } from './components/PhysicalPrintStage';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

import { DashboardView } from './views/DashboardView';
import { PrintChequeView } from './views/PrintChequeView';
import { ChequeHistoryView } from './views/ChequeHistoryView';
import { BankManagementView } from './views/BankManagementView';
import { TemplateDesignerView } from './views/TemplateDesignerView';
import { PayeeManagementView } from './views/PayeeManagementView';
import { CalibrationView } from './views/CalibrationView';
import { SettingsView } from './views/SettingsView';
import { createStandardTemplate } from './utils/defaultData';

type ViewMode =
  | 'dashboard'
  | 'print'
  | 'history'
  | 'banks'
  | 'templates'
  | 'payees'
  | 'calibration'
  | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Core Data Stores
  const [banks, setBanks] = useState<BankConfig[]>([]);
  const [templates, setTemplates] = useState<ChequeTemplate[]>([]);
  const [cheques, setCheques] = useState<ChequeRecord[]>([]);
  const [payees, setPayees] = useState<PayeeRecord[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Printing execution state
  const [activePrintData, setActivePrintData] = useState<PrintData | null>(null);
  const [pendingPrintChequeRecord, setPendingPrintChequeRecord] = useState<ChequeRecord | null>(null);
  const [reprintTargetCheque, setReprintTargetCheque] = useState<ChequeRecord | null>(null);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);

  // Navigation context params (e.g. initial bankId when jumping to print)
  const [navBankId, setNavBankId] = useState<string | undefined>(undefined);

  // Load all data from IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      const [bList, tList, cList, pList, calList, sObj] = await Promise.all([
        dbService.getBanks(),
        dbService.getTemplates(),
        dbService.getCheques(),
        dbService.getPayees(),
        dbService.getCalibrations(),
        dbService.getSettings(),
      ]);

      setBanks(bList);
      setTemplates(tList);
      setCheques(cList);
      setPayees(pList);
      setCalibrations(calList);
      setSettings(sObj);
    } catch (e) {
      console.error('Failed to load IndexedDB data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle physical print execution
  const handlePrintCheque = (
    bank: BankConfig,
    template: ChequeTemplate,
    cheque: ChequeRecord,
    calibration: CalibrationProfile | null
  ) => {
    setPendingPrintChequeRecord(cheque);
    setActivePrintData({
      bank,
      template,
      calibration,
      cheque,
      mode: 'cheque',
    });

    // Timeout allows DOM injection before triggering print dialog
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Handle print completion
  const handlePrintComplete = async () => {
    if (pendingPrintChequeRecord) {
      try {
        await dbService.saveCheque(pendingPrintChequeRecord);
        await refreshAllData();
        setPrintSuccessNotice(
          `Cheque #${pendingPrintChequeRecord.chequeNumber} printed and recorded in history.`
        );
        setTimeout(() => setPrintSuccessNotice(null), 4000);
      } catch (err) {
        console.error('Failed to save printed cheque:', err);
      }
    }
    setActivePrintData(null);
    setPendingPrintChequeRecord(null);
  };

  // Handle printing test alignment sheet
  const handlePrintTestAlignmentSheet = (
    bank: BankConfig,
    template: ChequeTemplate,
    calibration: CalibrationProfile | null
  ) => {
    setActivePrintData({
      bank,
      template,
      calibration,
      mode: 'test-alignment',
    });

    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Navigation helper
  const handleNavigate = (view: string, context?: { bankId?: string; chequeId?: string }) => {
    if (context?.bankId) {
      setNavBankId(context.bankId);
    } else {
      setNavBankId(undefined);
    }
    setReprintTargetCheque(null);
    setCurrentView(view as ViewMode);
  };

  // Launch reprint flow
  const handleReprintCheque = (cheque: ChequeRecord) => {
    setReprintTargetCheque(cheque);
    setCurrentView('print');
  };

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'print', label: 'Print Cheque', icon: Printer },
    { id: 'history', label: 'Cheque History', icon: History },
    { id: 'banks', label: 'Bank Management', icon: Building2 },
    { id: 'templates', label: 'Cheque Templates', icon: Sliders },
    { id: 'payees', label: 'Payee Management', icon: Users },
    { id: 'calibration', label: 'Printing Calibration', icon: Compass },
    { id: 'settings', label: 'Settings & Data', icon: SettingsIcon },
  ];

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-sm font-semibold tracking-wide">
          Loading Office Cheque Manager (IndexedDB)...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* ================= PHYSICAL PRINT STAGE ================= */}
      {/* Renders only when printing; hidden on screen via CSS */}
      <PhysicalPrintStage
        printData={activePrintData}
        onPrintComplete={handlePrintComplete}
      />

      {/* Screen Interface Wrapper */}
      <div className="no-print flex flex-1 h-screen overflow-hidden">
        {/* ================= COLLAPSIBLE SIDEBAR ================= */}
        <aside
          className={`bg-slate-900 text-slate-300 flex flex-col justify-between transition-all duration-200 border-r border-slate-800 shrink-0 z-40 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          {/* Top Brand Section */}
          <div>
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white shrink-0 border border-white/15">
                    रू
                  </div>
                  <div className="leading-tight truncate">
                    <span className="font-bold text-sm text-white tracking-tight">
                      ChequeCraft
                    </span>
                    <span className="block text-[10px] text-slate-400 font-medium">
                      Nepal Office Edition
                    </span>
                  </div>
                </div>
              )}

              {sidebarCollapsed && (
                <div className="mx-auto w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white shrink-0 border border-white/15">
                  रू
                </div>
              )}

              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Nav Menu */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setReprintTargetCheque(null);
                      setCurrentView(item.id as ViewMode);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Status */}
          {!sidebarCollapsed ? (
            <div className="p-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>IndexedDB Local Storage</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {banks.length} Banks · {cheques.length} Cheques Logged
              </div>
            </div>
          ) : (
            <div className="p-3 border-t border-slate-800 flex justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
          )}
        </aside>

        {/* ================= MAIN CONTENT VIEWPORT ================= */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Top Header Bar Contract */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 gap-8">
            {/* Zone 1: Contextual Breadcrumb / Title */}
            <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
              <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                Office Cheque Manager
              </span>
              <span>/</span>
              <span className="font-medium text-slate-600 capitalize">
                {navItems.find((n) => n.id === currentView)?.label}
              </span>
            </div>

            {/* Zone 2: Navigation Links (Desktop Quick Access) */}
            <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'dashboard' ? 'text-slate-900 font-bold' : ''
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setReprintTargetCheque(null);
                  setCurrentView('print');
                }}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'print' ? 'text-slate-900 font-bold' : ''
                }`}
              >
                Cheque Entry
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'history' ? 'text-slate-900 font-bold' : ''
                }`}
              >
                History Ledger
              </button>
              <button
                onClick={() => setCurrentView('calibration')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap cursor-pointer ${
                  currentView === 'calibration' ? 'text-slate-900 font-bold' : ''
                }`}
              >
                Calibration
              </button>
            </div>

            {/* Zone 3: Primary Action & PWA Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <PWAInstallButton />

              {currentView !== 'print' && (
                <button
                  onClick={() => {
                    setReprintTargetCheque(null);
                    setCurrentView('print');
                  }}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Quick Print</span>
                </button>
              )}
            </div>
          </header>

          {/* Success Notification Alert */}
          {printSuccessNotice && (
            <div className="bg-emerald-600 text-white text-xs px-6 py-2 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold">{printSuccessNotice}</span>
              </div>
              <button
                onClick={() => setPrintSuccessNotice(null)}
                className="text-white/80 hover:text-white cursor-pointer text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* Scrollable View Container */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {currentView === 'dashboard' && (
                <DashboardView
                  cheques={cheques}
                  banks={banks}
                  onNavigate={handleNavigate}
                  onReprintCheque={handleReprintCheque}
                />
              )}

              {currentView === 'print' && (
                <PrintChequeView
                  banks={banks}
                  templates={templates}
                  payees={payees}
                  calibrations={calibrations}
                  settings={settings}
                  initialBankId={navBankId}
                  reprintCheque={reprintTargetCheque}
                  onPrintCheque={handlePrintCheque}
                  onSaveCheque={async (chk) => {
                    await dbService.saveCheque(chk);
                    await refreshAllData();
                    setPrintSuccessNotice(`Cheque #${chk.chequeNumber} saved successfully.`);
                    setTimeout(() => setPrintSuccessNotice(null), 3000);
                  }}
                  onCheckDuplicate={(bankId, chequeNumber, excludeId) =>
                    dbService.checkDuplicateCheque(bankId, chequeNumber, excludeId)
                  }
                  onSaveNewPayee={async (p) => {
                    await dbService.savePayee(p);
                    await refreshAllData();
                  }}
                />
              )}

              {currentView === 'history' && (
                <ChequeHistoryView
                  cheques={cheques}
                  banks={banks}
                  onReprintCheque={handleReprintCheque}
                  onUpdateChequeStatus={async (id, status) => {
                    const chk = await dbService.getCheque(id);
                    if (chk) {
                      chk.status = status;
                      chk.updatedAt = new Date().toISOString();
                      await dbService.saveCheque(chk);
                      await refreshAllData();
                    }
                  }}
                  onDeleteCheque={async (id) => {
                    await dbService.deleteCheque(id);
                    await refreshAllData();
                  }}
                />
              )}

              {currentView === 'banks' && (
                <BankManagementView
                  banks={banks}
                  templates={templates}
                  onSaveBank={async (bank) => {
                    await dbService.saveBank(bank);
                    // Ensure bank has at least 1 template
                    const existingTmpls = await dbService.getTemplatesForBank(bank.id);
                    if (existingTmpls.length === 0) {
                      const newTmpl = createStandardTemplate(
                        `tmpl-${bank.id}-std`,
                        bank.id,
                        `${bank.shortName} Standard Cheque`
                      );
                      await dbService.saveTemplate(newTmpl);
                    }
                    await refreshAllData();
                  }}
                  onDeleteBank={async (bankId) => {
                    await dbService.deleteBank(bankId);
                    await refreshAllData();
                  }}
                  onSetDefaultBank={async (bankId) => {
                    const updatedBanks = banks.map((b) => ({
                      ...b,
                      isDefault: b.id === bankId,
                    }));
                    for (const b of updatedBanks) {
                      await dbService.saveBank(b);
                    }
                    if (settings) {
                      const newSettings = { ...settings, defaultBankId: bankId };
                      await dbService.saveSettings(newSettings);
                    }
                    await refreshAllData();
                  }}
                  onNavigateToTemplates={(bankId) => {
                    setNavBankId(bankId);
                    setCurrentView('templates');
                  }}
                />
              )}

              {currentView === 'templates' && (
                <TemplateDesignerView
                  banks={banks}
                  templates={templates}
                  onSaveTemplate={async (tmpl) => {
                    await dbService.saveTemplate(tmpl);
                    await refreshAllData();
                  }}
                  onDuplicateTemplate={async (tmpl) => {
                    const dup: ChequeTemplate = {
                      ...tmpl,
                      id: `tmpl-${Date.now()}`,
                      name: `${tmpl.name} (Copy)`,
                      isDefault: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    await dbService.saveTemplate(dup);
                    await refreshAllData();
                  }}
                  onResetTemplate={async (tmplId) => {
                    const tmpl = await dbService.getTemplate(tmplId);
                    if (tmpl) {
                      const std = createStandardTemplate(
                        tmpl.id,
                        tmpl.bankId,
                        tmpl.name
                      );
                      await dbService.saveTemplate(std);
                      await refreshAllData();
                    }
                  }}
                />
              )}

              {currentView === 'payees' && (
                <PayeeManagementView
                  payees={payees}
                  onSavePayee={async (payee) => {
                    await dbService.savePayee(payee);
                    await refreshAllData();
                  }}
                  onDeletePayee={async (payeeId) => {
                    await dbService.deletePayee(payeeId);
                    await refreshAllData();
                  }}
                  onIssueChequeToPayee={(payee) => {
                    setCurrentView('print');
                  }}
                />
              )}

              {currentView === 'calibration' && (
                <CalibrationView
                  banks={banks}
                  templates={templates}
                  calibrations={calibrations}
                  defaultCalibrationId={settings.defaultPrinterProfileId}
                  onSaveCalibration={async (profile) => {
                    await dbService.saveCalibration(profile);
                    await refreshAllData();
                  }}
                  onDeleteCalibration={async (profileId) => {
                    await dbService.deleteCalibration(profileId);
                    await refreshAllData();
                  }}
                  onSetDefaultCalibration={async (profileId) => {
                    if (settings) {
                      const newSettings = { ...settings, defaultPrinterProfileId: profileId };
                      await dbService.saveSettings(newSettings);
                      await refreshAllData();
                    }
                  }}
                  onPrintTestAlignmentSheet={handlePrintTestAlignmentSheet}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  settings={settings}
                  banks={banks}
                  calibrations={calibrations}
                  onSaveSettings={async (newSettings) => {
                    await dbService.saveSettings(newSettings);
                    await refreshAllData();
                  }}
                  onExportBackup={() => dbService.exportFullBackup()}
                  onImportBackup={async (backup, mode) => {
                    await dbService.importFullBackup(backup, mode);
                    await refreshAllData();
                  }}
                  onClearDatabase={async () => {
                    await dbService.clearAllData();
                    await refreshAllData();
                  }}
                  onResetSampleData={async () => {
                    await dbService.resetToSampleData();
                    await refreshAllData();
                  }}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Offline Status Toast Indicator */}
      <OfflineIndicator />
    </div>
  );
}
