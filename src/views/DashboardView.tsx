import React, { useMemo } from 'react';
import {
  Printer,
  FileCheck,
  Clock,
  Building2,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { BankConfig, ChequeRecord } from '../types';
import { formatNepaliCurrency, formatDisplayDate } from '../utils/nepaliNumberWords';

interface DashboardViewProps {
  cheques: ChequeRecord[];
  banks: BankConfig[];
  onNavigate: (view: string, context?: { bankId?: string; chequeId?: string }) => void;
  onReprintCheque: (cheque: ChequeRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cheques,
  banks,
  onNavigate,
  onReprintCheque,
}) => {
  // Aggregate real stats
  const metrics = useMemo(() => {
    let totalPrintedCount = 0;
    let totalDisbursedNpr = 0;
    let clearedCount = 0;
    let pendingDraftCount = 0;

    const bankUsageMap: Record<string, number> = {};

    cheques.forEach((chk) => {
      if (chk.status === 'Printed' || chk.status === 'Cleared') {
        totalPrintedCount += 1;
        totalDisbursedNpr += chk.amount || 0;
      }
      if (chk.status === 'Cleared') {
        clearedCount += 1;
      } else if (chk.status === 'Draft') {
        pendingDraftCount += 1;
      }

      bankUsageMap[chk.bankId] = (bankUsageMap[chk.bankId] || 0) + 1;
    });

    const bankUsageList = Object.entries(bankUsageMap)
      .map(([bankId, count]) => {
        const bank = banks.find((b) => b.id === bankId);
        return {
          bankId,
          bankName: bank?.name || 'Unknown Bank',
          shortName: bank?.shortName || 'Bank',
          color: bank?.primaryColor || '#0f172a',
          count,
          percentage: cheques.length > 0 ? Math.round((count / cheques.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalCheques: cheques.length,
      totalPrintedCount,
      totalDisbursedNpr,
      clearedCount,
      pendingDraftCount,
      topBanks: bankUsageList.slice(0, 4),
    };
  }, [cheques, banks]);

  const recentCheques = useMemo(() => {
    return cheques.slice(0, 6);
  }, [cheques]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Office Cheque Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounting ledger overview, disburals, and physical printing controls for Nepal offices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('print')}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print New Cheque</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Printed */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cheques Printed</span>
            <Printer className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 font-tabular">
            {metrics.totalPrintedCount}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>Total records in ledger:</span>
            <span className="font-semibold text-slate-700 font-tabular">{metrics.totalCheques}</span>
          </div>
        </div>

        {/* Total Disbursed NPR */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Disbursed Amount</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 font-tabular">
            NPR {formatNepaliCurrency(metrics.totalDisbursedNpr, { includeDecimals: false })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="text-emerald-600 font-medium">Sum of printed & cleared</span>
          </div>
        </div>

        {/* Cleared Cheques */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cleared at Bank</span>
            <FileCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 font-tabular">
            {metrics.clearedCount}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Verified debit transactions</span>
          </div>
        </div>

        {/* Pending Drafts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Drafts</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 font-tabular">
            {metrics.pendingDraftCount}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Awaiting printer verification</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity + Frequently Used Banks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Cheques Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Cheques Issued</h2>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View All History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {recentCheques.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No cheques recorded yet.</p>
                <button
                  onClick={() => onNavigate('print')}
                  className="mt-3 text-xs font-semibold text-slate-800 underline"
                >
                  Create and print your first cheque
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Cheque #</th>
                    <th className="py-2.5 px-4">Bank</th>
                    <th className="py-2.5 px-4">Payee</th>
                    <th className="py-2.5 px-4 text-right">Amount (NPR)</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentCheques.map((chk) => {
                    const bank = banks.find((b) => b.id === chk.bankId);
                    return (
                      <tr key={chk.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-tabular text-slate-600 whitespace-nowrap">
                          {formatDisplayDate(chk.chequeDate)}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {chk.chequeNumber ? chk.chequeNumber : <span className="text-slate-400 font-normal">—</span>}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-slate-700">{bank?.shortName || 'Bank'}</span>
                        </td>
                        <td className="py-3 px-4 max-w-[160px] truncate font-semibold text-slate-900">
                          {chk.payeeName}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 font-tabular whitespace-nowrap">
                          {formatNepaliCurrency(chk.amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              chk.status === 'Printed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : chk.status === 'Cleared'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : chk.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {chk.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => onReprintCheque(chk)}
                            className="text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer underline mr-2"
                            title="Reprint Cheque Leaf"
                          >
                            Reprint
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 1 Col: Frequently Used Banks & Quick Actions */}
        <div className="space-y-6">
          {/* Frequently Used Banks */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-900">Frequently Used Banks</h2>
              </div>
              <button
                onClick={() => onNavigate('banks')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {metrics.topBanks.length === 0 ? (
                <p className="text-xs text-slate-400">No bank activity recorded yet.</p>
              ) : (
                metrics.topBanks.map((item) => (
                  <div key={item.bankId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-slate-800">{item.shortName}</span>
                      </div>
                      <span className="font-mono text-slate-500 font-tabular">
                        {item.count} cheques ({item.percentage}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Bank Shortcuts for Immediate Printing */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-tight">Quick Print by Bank</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select your bank to launch the pre-calibrated cheque form directly:
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {banks.slice(0, 4).map((b) => (
                <button
                  key={b.id}
                  onClick={() => onNavigate('print', { bankId: b.id })}
                  className="bg-slate-800 hover:bg-slate-700 text-left p-2.5 rounded-lg border border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                    {b.shortName}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {b.widthMm} × {b.heightMm}mm
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigate('calibration')}
              className="mt-4 w-full py-2 bg-slate-800/80 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Verify Printer Calibration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
