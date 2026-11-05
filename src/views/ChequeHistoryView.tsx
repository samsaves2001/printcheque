import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit3,
  Eye,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { BankConfig, ChequeRecord, ChequeStatus } from '../types';
import { formatNepaliCurrency, formatDisplayDate } from '../utils/nepaliNumberWords';

interface ChequeHistoryViewProps {
  cheques: ChequeRecord[];
  banks: BankConfig[];
  onReprintCheque: (cheque: ChequeRecord) => void;
  onUpdateChequeStatus: (chequeId: string, status: ChequeStatus) => Promise<void>;
  onDeleteCheque: (chequeId: string) => Promise<void>;
}

export const ChequeHistoryView: React.FC<ChequeHistoryViewProps> = ({
  cheques,
  banks,
  onReprintCheque,
  onUpdateChequeStatus,
  onDeleteCheque,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'chequeNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedDetailCheque, setSelectedDetailCheque] = useState<ChequeRecord | null>(null);
  const [reprintWarningCheque, setReprintWarningCheque] = useState<ChequeRecord | null>(null);

  // Filter & Sort
  const filteredCheques = useMemo(() => {
    return cheques.filter((chk) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesPayee = chk.payeeName.toLowerCase().includes(query);
        const matchesNumber = chk.chequeNumber.toLowerCase().includes(query);
        const matchesMemo = (chk.memo || '').toLowerCase().includes(query);
        if (!matchesPayee && !matchesNumber && !matchesMemo) return false;
      }

      // Bank
      if (selectedBankFilter !== 'all' && chk.bankId !== selectedBankFilter) {
        return false;
      }

      // Status
      if (selectedStatusFilter !== 'all' && chk.status !== selectedStatusFilter) {
        return false;
      }

      // Date Range
      if (dateFrom && chk.chequeDate < dateFrom) return false;
      if (dateTo && chk.chequeDate > dateTo) return false;

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.chequeDate).getTime() - new Date(b.chequeDate).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'chequeNumber') {
        comparison = a.chequeNumber.localeCompare(b.chequeNumber);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [cheques, searchTerm, selectedBankFilter, selectedStatusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredCheques.length === 0) {
      alert('No cheques available to export.');
      return;
    }

    const headers = [
      'Cheque Date',
      'Cheque Number',
      'Bank Name',
      'Payee Name',
      'Amount (NPR)',
      'Amount in Words',
      'Status',
      'Print Count',
      'A/C Payee Only',
      'Memo',
      'Created At',
    ];

    const rows = filteredCheques.map((c) => {
      const bank = banks.find((b) => b.id === c.bankId);
      return [
        `"${c.chequeDate}"`,
        `"${c.chequeNumber}"`,
        `"${bank?.name || c.bankId}"`,
        `"${c.payeeName.replace(/"/g, '""')}"`,
        `"${c.amount}"`,
        `"${c.amountInWords.replace(/"/g, '""')}"`,
        `"${c.status}"`,
        `"${c.printCount}"`,
        `"${c.isAcPayeeOnly ? 'YES' : 'NO'}"`,
        `"${(c.memo || '').replace(/"/g, '""')}"`,
        `"${c.createdAt}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cheque-history-nepal-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmReprint = () => {
    if (reprintWarningCheque) {
      const chk = reprintWarningCheque;
      setReprintWarningCheque(null);
      onReprintCheque(chk);
    }
  };

  const handleDelete = async (id: string, chqNum: string) => {
    if (confirm(`Are you sure you want to delete Cheque record #${chqNum}? This cannot be undone.`)) {
      await onDeleteCheque(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cheque History & Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Permanent local record of all printed, cleared, and drafted bank cheques.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export CSV Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Payee, Cheque #, or Memo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Bank Filter */}
          <div>
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
            >
              <option value="all">All Banks</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-800"
            >
              <option value="all">All Statuses</option>
              <option value="Printed">Printed</option>
              <option value="Cleared">Cleared</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Date Range & Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
              title="From Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
              title="To Date"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-slate-500 hover:text-slate-800 underline text-[11px] ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white"
            >
              <option value="date">Cheque Date</option>
              <option value="amount">Amount</option>
              <option value="chequeNumber">Cheque #</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 border border-slate-300 rounded hover:bg-slate-50 text-slate-700 cursor-pointer"
              title="Toggle Ascending / Descending"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <span className="text-slate-400 pl-2">
              Showing <strong>{filteredCheques.length}</strong> of {cheques.length}
            </span>
          </div>
        </div>
      </div>

      {/* Cheque Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredCheques.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No cheque records match your filters.</p>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting the search query, bank selection, or date range.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Cheque #</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4">Payee</th>
                  <th className="py-3 px-4 text-right">Amount (NPR)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Prints</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCheques.map((chk) => {
                  const bank = banks.find((b) => b.id === chk.bankId);
                  return (
                    <tr key={chk.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-tabular text-slate-700 whitespace-nowrap">
                        {formatDisplayDate(chk.chequeDate)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {chk.chequeNumber ? chk.chequeNumber : <span className="text-slate-400 font-normal">—</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: bank?.primaryColor || '#0f172a' }}
                          />
                          <span className="font-semibold text-slate-800">
                            {bank?.shortName || 'Bank'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[220px] truncate">
                        {chk.payeeName}
                        {chk.memo && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {chk.memo}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 font-tabular whitespace-nowrap">
                        {formatNepaliCurrency(chk.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <select
                          value={chk.status}
                          onChange={(e) =>
                            onUpdateChequeStatus(chk.id, e.target.value as ChequeStatus)
                          }
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                            chk.status === 'Printed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : chk.status === 'Cleared'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : chk.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Printed">Printed</option>
                          <option value="Cleared">Cleared</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600 font-tabular whitespace-nowrap">
                        {chk.printCount}x
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailCheque(chk)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (chk.printCount > 0) {
                              setReprintWarningCheque(chk);
                            } else {
                              onReprintCheque(chk);
                            }
                          }}
                          className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                          title="Reprint Cheque Leaf"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(chk.id, chk.chequeNumber)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                          title="Delete Cheque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Reprint Duplicate Warning Modal */}
      {reprintWarningCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-amber-300">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Warning: Cheque Already Printed ({reprintWarningCheque.printCount}x)
              </h3>
            </div>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Cheque #<strong>{reprintWarningCheque.chequeNumber}</strong> for{' '}
              <strong>{reprintWarningCheque.payeeName}</strong> (NPR{' '}
              {formatNepaliCurrency(reprintWarningCheque.amount)}) was already physically printed on{' '}
              <strong>{reprintWarningCheque.lastPrintedAt?.slice(0, 10) || reprintWarningCheque.chequeDate}</strong>.
            </p>
            <p className="mt-2 text-xs text-amber-900 font-semibold bg-amber-50 p-2.5 rounded border border-amber-200">
              Reprinting may cause double issuance if the original leaf was already handed to the recipient!
              Please ensure you are re-feeding a fresh blank leaf or voiding the previous one.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReprintWarningCheque(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReprint}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              >
                Proceed to Reprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Record Detail Modal */}
      {selectedDetailCheque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Cheque Record Details
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedDetailCheque.chequeNumber ? `Cheque #${selectedDetailCheque.chequeNumber}` : 'Cheque (Unnumbered)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailCheque(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400">Date on Leaf:</span>
                  <div className="font-semibold text-slate-800">
                    {formatDisplayDate(selectedDetailCheque.chequeDate)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <div className="font-bold text-slate-800">
                    {selectedDetailCheque.status}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Bank:</span>
                  <div className="font-semibold text-slate-800">
                    {banks.find((b) => b.id === selectedDetailCheque.bankId)?.name || 'Unknown'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Print Count:</span>
                  <div className="font-mono font-bold text-slate-800">
                    {selectedDetailCheque.printCount} time(s)
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400">Payee Name:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedDetailCheque.payeeName}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Amount in Figures:</span>
                <div className="font-mono font-extrabold text-slate-900 text-base mt-0.5">
                  NPR {formatNepaliCurrency(selectedDetailCheque.amount)}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Amount in Words:</span>
                <div className="font-semibold text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 mt-0.5 leading-relaxed">
                  {selectedDetailCheque.amountInWords}
                </div>
              </div>

              {selectedDetailCheque.memo && (
                <div>
                  <span className="text-slate-400">Memo / Description:</span>
                  <div className="text-slate-700 mt-0.5">
                    {selectedDetailCheque.memo}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <div>
                  A/C Payee Only: <strong>{selectedDetailCheque.isAcPayeeOnly ? 'Yes' : 'No'}</strong>
                </div>
                <div>
                  Struck Bearer: <strong>{selectedDetailCheque.strikeBearer ? 'Yes' : 'No'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDetailCheque(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const chk = selectedDetailCheque;
                  setSelectedDetailCheque(null);
                  if (chk.printCount > 0) {
                    setReprintWarningCheque(chk);
                  } else {
                    onReprintCheque(chk);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reprint Cheque</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
