import {
  BankConfig,
  ChequeTemplate,
  ChequeRecord,
  PayeeRecord,
  CalibrationProfile,
  AppSettings,
  FullBackupData,
} from '../types';
import {
  DEFAULT_BANKS,
  DEFAULT_TEMPLATES,
  DEFAULT_PAYEES,
  DEFAULT_CALIBRATIONS,
  DEFAULT_SETTINGS,
  INITIAL_CHEQUES,
  createStandardTemplate,
} from '../utils/defaultData';

const DB_NAME = 'NepalChequeManagerDB';
const DB_VERSION = 1;

export class ChequeDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('banks')) {
          db.createObjectStore('banks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('templates')) {
          const tmplStore = db.createObjectStore('templates', { keyPath: 'id' });
          tmplStore.createIndex('bankId', 'bankId', { unique: false });
        }
        if (!db.objectStoreNames.contains('cheques')) {
          const chqStore = db.createObjectStore('cheques', { keyPath: 'id' });
          chqStore.createIndex('bankId', 'bankId', { unique: false });
          chqStore.createIndex('chequeNumber', 'chequeNumber', { unique: false });
          chqStore.createIndex('chequeDate', 'chequeDate', { unique: false });
          chqStore.createIndex('status', 'status', { unique: false });
        }
        if (!db.objectStoreNames.contains('payees')) {
          db.createObjectStore('payees', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('calibrations')) {
          db.createObjectStore('calibrations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;
        // Verify if seeds exist
        try {
          await this.seedDefaultsIfEmpty(db);
        } catch (e) {
          console.error('Error seeding defaults:', e);
        }
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async seedDefaultsIfEmpty(db: IDBDatabase): Promise<void> {
    const tx = db.transaction(['banks', 'templates', 'payees', 'calibrations', 'settings', 'cheques'], 'readwrite');
    const banksStore = tx.objectStore('banks');
    const chqStore = tx.objectStore('cheques');
    const payeeStore = tx.objectStore('payees');
    const countReq = banksStore.count();

    return new Promise((resolve) => {
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          // Empty DB, seed defaults (banks, templates, calibrations, settings only; zero demo cheques/payees)
          DEFAULT_BANKS.forEach((b) => banksStore.put(b));

          const tmplStore = tx.objectStore('templates');
          DEFAULT_TEMPLATES.forEach((t) => tmplStore.put(t));

          DEFAULT_PAYEES.forEach((p) => payeeStore.put(p));

          const calibStore = tx.objectStore('calibrations');
          DEFAULT_CALIBRATIONS.forEach((c) => calibStore.put(c));

          const settingsStore = tx.objectStore('settings');
          settingsStore.put({ key: 'appSettings', value: DEFAULT_SETTINGS });

          INITIAL_CHEQUES.forEach((chk) => chqStore.put(chk));
        } else {
          // Fresh start migration: purge any previous demo cheques and demo payees
          const demoChequeIds = ['chk-1001', 'chk-1002', 'chk-1003', 'chk-1004'];
          demoChequeIds.forEach((id) => chqStore.delete(id));

          const demoPayeeIds = [
            'payee-nea',
            'payee-ird',
            'payee-ntc',
            'payee-kantipur',
            'payee-shrestha',
            'payee-bhatbhateni',
          ];
          demoPayeeIds.forEach((id) => payeeStore.delete(id));

          // Clean demo account names from existing banks
          const allBanksReq = banksStore.getAll();
          allBanksReq.onsuccess = () => {
            const list: BankConfig[] = allBanksReq.result || [];
            list.forEach((b) => {
              if (b.accountHolderName === 'Apex Accounting Services Pvt. Ltd.') {
                b.accountHolderName = '';
                b.accountNumber = '';
                banksStore.put(b);
              }
            });
          };
        }
        resolve();
      };
      countReq.onerror = () => resolve();
    });
  }

  // --- BANKS ---
  async getBanks(): Promise<BankConfig[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['banks', 'templates'], 'readwrite');
      const store = tx.objectStore('banks');
      const req = store.getAll();
      req.onsuccess = () => {
        const banks: BankConfig[] = req.result || [];
        const hasPrabhu = banks.some((b) => b.id === 'bank-prabhu' || b.name.toLowerCase().includes('prabhu'));
        if (!hasPrabhu) {
          const prabhuBank: BankConfig = {
            id: 'bank-prabhu',
            name: 'Prabhu Bank Limited',
            shortName: 'Prabhu Bank',
            branch: 'Babarmahal, Kathmandu',
            accountHolderName: 'Apex Accounting Services Pvt. Ltd.',
            accountNumber: '00100100928371',
            widthMm: 203,
            heightMm: 76,
            defaultTemplateId: 'tmpl-prabhu-std',
            isDefault: false,
            primaryColor: '#c51d24',
            createdAt: new Date().toISOString(),
          };
          store.put(prabhuBank);
          const tmplStore = tx.objectStore('templates');
          const prabhuTmpl = createStandardTemplate(
            'tmpl-prabhu-std',
            'bank-prabhu',
            'Prabhu Bank Standard Cheque'
          );
          tmplStore.put(prabhuTmpl);
          banks.push(prabhuBank);
        }
        resolve(banks);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getBank(id: string): Promise<BankConfig | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('banks', 'readonly');
      const store = tx.objectStore('banks');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveBank(bank: BankConfig): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('banks', 'readwrite');
      const store = tx.objectStore('banks');
      const req = store.put(bank);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteBank(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['banks', 'templates'], 'readwrite');
      const banksStore = tx.objectStore('banks');
      const tmplStore = tx.objectStore('templates');

      banksStore.delete(id);

      // Clean up templates associated with this bank
      const index = tmplStore.index('bankId');
      const req = index.getAllKeys(id);
      req.onsuccess = () => {
        const keys = req.result;
        keys.forEach((key) => tmplStore.delete(key));
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- TEMPLATES ---
  async getTemplates(): Promise<ChequeTemplate[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const store = tx.objectStore('templates');
      const req = store.getAll();
      req.onsuccess = () => {
        const list: ChequeTemplate[] = req.result || [];
        list.forEach((t) => {
          if (t.fields?.acPayeeCrossing && t.fields.acPayeeCrossing.label === 'A/C PAYEE ONLY') {
            t.fields.acPayeeCrossing.label = 'A/C PAYEE';
          }
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getTemplatesForBank(bankId: string): Promise<ChequeTemplate[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const index = tx.objectStore('templates').index('bankId');
      const req = index.getAll(bankId);
      req.onsuccess = () => {
        const list: ChequeTemplate[] = req.result || [];
        list.forEach((t) => {
          if (t.fields?.acPayeeCrossing && t.fields.acPayeeCrossing.label === 'A/C PAYEE ONLY') {
            t.fields.acPayeeCrossing.label = 'A/C PAYEE';
          }
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getTemplate(id: string): Promise<ChequeTemplate | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const store = tx.objectStore('templates');
      const req = store.get(id);
      req.onsuccess = () => {
        const t: ChequeTemplate | null = req.result || null;
        if (t?.fields?.acPayeeCrossing && t.fields.acPayeeCrossing.label === 'A/C PAYEE ONLY') {
          t.fields.acPayeeCrossing.label = 'A/C PAYEE';
        }
        resolve(t);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveTemplate(template: ChequeTemplate): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const store = tx.objectStore('templates');
      const req = store.put(template);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const store = tx.objectStore('templates');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- CHEQUES ---
  async getCheques(): Promise<ChequeRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheques', 'readonly');
      const store = tx.objectStore('cheques');
      const req = store.getAll();
      req.onsuccess = () => {
        const records: ChequeRecord[] = req.result || [];
        // Sort descending by date / creation
        records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCheque(id: string): Promise<ChequeRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheques', 'readonly');
      const store = tx.objectStore('cheques');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async checkDuplicateCheque(bankId: string, chequeNumber: string, excludeId?: string): Promise<ChequeRecord | null> {
    if (!chequeNumber || !chequeNumber.trim()) return null;
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheques', 'readonly');
      const store = tx.objectStore('cheques');
      const req = store.getAll();
      req.onsuccess = () => {
        const cheques: ChequeRecord[] = req.result || [];
        const cleanNo = chequeNumber.trim().toLowerCase();
        if (!cleanNo) {
          resolve(null);
          return;
        }
        const found = cheques.find(
          (c) => c.bankId === bankId && c.chequeNumber && c.chequeNumber.trim().toLowerCase() === cleanNo && c.id !== excludeId
        );
        resolve(found || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveCheque(cheque: ChequeRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cheques', 'payees'], 'readwrite');
      const chqStore = tx.objectStore('cheques');
      const payeeStore = tx.objectStore('payees');

      chqStore.put(cheque);

      // If linked payee, update their count and amount if not already counted
      if (cheque.payeeId) {
        const pReq = payeeStore.get(cheque.payeeId);
        pReq.onsuccess = () => {
          const payee: PayeeRecord | undefined = pReq.result;
          if (payee) {
            payee.updatedAt = new Date().toISOString();
            payeeStore.put(payee);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteCheque(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheques', 'readwrite');
      const store = tx.objectStore('cheques');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllCheques(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cheques', 'readwrite');
      const store = tx.objectStore('cheques');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- PAYEES ---
  async getPayees(): Promise<PayeeRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('payees', 'readonly');
      const store = tx.objectStore('payees');
      const req = store.getAll();
      req.onsuccess = () => {
        const records: PayeeRecord[] = req.result || [];
        records.sort((a, b) => a.name.localeCompare(b.name));
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPayee(id: string): Promise<PayeeRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('payees', 'readonly');
      const store = tx.objectStore('payees');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async savePayee(payee: PayeeRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('payees', 'readwrite');
      const store = tx.objectStore('payees');
      const req = store.put(payee);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deletePayee(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('payees', 'readwrite');
      const store = tx.objectStore('payees');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- CALIBRATIONS ---
  async getCalibrations(): Promise<CalibrationProfile[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('calibrations', 'readwrite');
      const store = tx.objectStore('calibrations');
      const req = store.getAll();
      req.onsuccess = () => {
        const list: CalibrationProfile[] = req.result || [];
        // Ensure default normal printer profiles exist
        DEFAULT_CALIBRATIONS.forEach((def) => {
          if (!list.some((c) => c.id === def.id)) {
            store.put(def);
            list.push(def);
          }
        });
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCalibration(id: string): Promise<CalibrationProfile | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('calibrations', 'readonly');
      const store = tx.objectStore('calibrations');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveCalibration(profile: CalibrationProfile): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('calibrations', 'readwrite');
      const store = tx.objectStore('calibrations');
      const req = store.put(profile);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCalibration(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('calibrations', 'readwrite');
      const store = tx.objectStore('calibrations');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AppSettings> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('appSettings');
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          const val = { ...DEFAULT_SETTINGS, ...req.result.value };
          if (val.defaultCrossingText === 'A/C PAYEE ONLY') {
            val.defaultCrossingText = 'A/C PAYEE';
          }
          resolve(val);
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key: 'appSettings', value: settings });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- BACKUP & RESTORE ---
  async exportFullBackup(): Promise<FullBackupData> {
    const [banks, templates, cheques, payees, calibrations, settings] = await Promise.all([
      this.getBanks(),
      this.getTemplates(),
      this.getCheques(),
      this.getPayees(),
      this.getCalibrations(),
      this.getSettings(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'Office Cheque Manager Nepal',
      banks,
      templates,
      cheques,
      payees,
      calibrations,
      settings,
    };
  }

  async importFullBackup(backup: FullBackupData, mode: 'merge' | 'replace'): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['banks', 'templates', 'cheques', 'payees', 'calibrations', 'settings'], 'readwrite');

      if (mode === 'replace') {
        tx.objectStore('banks').clear();
        tx.objectStore('templates').clear();
        tx.objectStore('cheques').clear();
        tx.objectStore('payees').clear();
        tx.objectStore('calibrations').clear();
        tx.objectStore('settings').clear();
      }

      const banksStore = tx.objectStore('banks');
      (backup.banks || []).forEach((b) => banksStore.put(b));

      const tmplStore = tx.objectStore('templates');
      (backup.templates || []).forEach((t) => tmplStore.put(t));

      const chqStore = tx.objectStore('cheques');
      (backup.cheques || []).forEach((c) => chqStore.put(c));

      const payeeStore = tx.objectStore('payees');
      (backup.payees || []).forEach((p) => payeeStore.put(p));

      const calibStore = tx.objectStore('calibrations');
      (backup.calibrations || []).forEach((c) => calibStore.put(c));

      if (backup.settings) {
        tx.objectStore('settings').put({ key: 'appSettings', value: backup.settings });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['banks', 'templates', 'cheques', 'payees', 'calibrations', 'settings'], 'readwrite');
      tx.objectStore('banks').clear();
      tx.objectStore('templates').clear();
      tx.objectStore('cheques').clear();
      tx.objectStore('payees').clear();
      tx.objectStore('calibrations').clear();
      tx.objectStore('settings').clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async resetToSampleData(): Promise<void> {
    await this.clearAllData();
    const db = await this.openDB();
    await this.seedDefaultsIfEmpty(db);
  }
}

export const dbService = new ChequeDatabase();
