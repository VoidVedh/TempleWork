import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Printer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { apiRequest } from '../utils/api';
import { formatIndianCurrency } from '../utils/numberToWords';
import { formatDate } from '../utils/dateUtils';
import HeroBanner from '../components/layout/HeroBanner';
import ExpenseTable from '../components/expenses/ExpenseTable';
import RecordExpenseModal, { EXPENSE_CATEGORIES } from '../components/expenses/RecordExpenseModal';

export default function ExpenseManagerView() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { refreshStats } = useData();

  const canManageExpenses = user && (user.role === 'ADMIN' || user.can_manage_expenses === 1);

  const [expenses, setExpenses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let query = `?search=${encodeURIComponent(search)}`;
      if (category && category !== 'all') {
        query += `&category=${encodeURIComponent(category)}`;
      }
      const res = await apiRequest(`/expenses${query}`);
      setExpenses(res.expenses || []);
      setTotalCount(res.total_count || 0);
      setTotalAmount(res.total_amount || 0);
    } catch (err) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleExpenseCreated = async () => {
    await refreshStats();
    await fetchExpenses();
  };

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`खर्च नोंद क्र. ${exp.voucher_no} (${exp.title} - ₹${exp.amount}) हटवायची आहे का?`)) {
      return;
    }

    try {
      await apiRequest(`/expenses/${exp.id}`, { method: 'DELETE' });
      await refreshStats();
      await fetchExpenses();
    } catch (err) {
      alert(err.message || 'खर्च हटवताना त्रुटी आली.');
    }
  };

  const handlePrintVoucher = (exp) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Expense Voucher - ${exp.voucher_no}</title>
          <style>
            body { font-family: 'Noto Sans Devanagari', -apple-system, sans-serif; padding: 20px; background: #fff; }
            .voucher-box { border: 2.5px solid #7f1d1d; padding: 24px; max-width: 650px; margin: 0 auto; border-radius: 8px; position: relative; }
            .swastik { position: absolute; font-size: 18px; color: #7f1d1d; font-weight: bold; }
            .swastik.tl { top: 6px; left: 8px; }
            .swastik.tr { top: 6px; right: 8px; }
            .swastik.bl { bottom: 6px; left: 8px; }
            .swastik.br { bottom: 6px; right: 8px; }
            .header { text-align: center; border-bottom: 2px solid #7f1d1d; padding-bottom: 12px; margin-bottom: 16px; }
            .invoc { font-size: 11px; font-weight: bold; color: #b45309; }
            .title { font-size: 22px; font-weight: 900; color: #7f1d1d; margin: 2px 0; }
            .sub { font-size: 11px; color: #334155; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-top: 4px; }
            .grid { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13px; }
            .grid td { padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; }
            .label { font-weight: bold; color: #475569; width: 35%; }
            .val { font-weight: bold; color: #0f172a; }
            .amount-box { background: #fee2e2; border: 1.5px solid #fecdd3; border-radius: 6px; padding: 12px; font-size: 18px; font-weight: 900; text-align: right; color: #be123c; margin: 16px 0; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .sign { text-align: center; width: 45%; border-top: 1px dotted #64748b; padding-top: 6px; font-size: 11px; font-weight: bold; color: #334155; }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <span class="swastik tl">卐</span>
            <span class="swastik tr">卐</span>
            <span class="swastik bl">卐</span>
            <span class="swastik br">卐</span>
            
            <div class="header">
              <div class="invoc">॥ श्री गणेशाय नमः ॥</div>
              <div class="title">श्री सिद्धिविनायक मंदिर</div>
              <div class="sub">उचगाव, ता. करवीर, जि. कोल्हापूर • Reg. No. MH/08/2024</div>
              <div class="badge">अधिकृत खर्च पेमेंट व्हाउचर (EXPENSE VOUCHER)</div>
            </div>

            <table class="grid">
              <tr>
                <td class="label">व्हाउचर क्र. (Voucher No.):</td>
                <td class="val" style="font-family: monospace; color: #be123c;">${exp.voucher_no}</td>
              </tr>
              <tr>
                <td class="label">दिनांक (Date):</td>
                <td class="val">${formatDate(exp.expense_date)}</td>
              </tr>
              <tr>
                <td class="label">खर्चाचे नाव व प्रयोजन:</td>
                <td class="val">${exp.title}</td>
              </tr>
              <tr>
                <td class="label">वर्गवारी (Category):</td>
                <td class="val">${exp.category}</td>
              </tr>
              <tr>
                <td class="label">कोणाला दिले (Paid To):</td>
                <td class="val">${exp.paid_to}</td>
              </tr>
              <tr>
                <td class="label">पेमेंट पद्धत:</td>
                <td class="val">${exp.payment_method}</td>
              </tr>
              <tr>
                <td class="label">मान्यता अधिकारी:</td>
                <td class="val">${exp.authorized_by}</td>
              </tr>
              <tr>
                <td class="label">नोंदणीकर्ता (Recorded By):</td>
                <td class="val">${exp.recorder_name}</td>
              </tr>
              ${exp.reason ? `<tr><td class="label">सविस्तर कारण:</td><td class="val">${exp.reason}</td></tr>` : ''}
            </table>

            <div class="amount-box">
              एकूण रक्कम : ₹ ${exp.amount.toLocaleString('en-IN')} /-
            </div>

            <div class="signatures">
              <div class="sign">प्राप्तकर्त्याची सही (Receiver Sign)</div>
              <div class="sign">अध्यक्षांची मान्यता सही (President Sign)</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      {/* 1. Hero Banner */}
      <HeroBanner
        theme="maroon"
        tag="॥ पारदर्शक खर्च व्यवस्थापन ॥ • EXPENSE MANAGER"
        title={t('expenseManagerTitle')}
        subtitle={t('expenseManagerSub')}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', textAlign: 'right', border: '1px solid rgba(254, 240, 138, 0.2)' }}>
              <div style={{ fontSize: '10px', color: '#fed7aa' }}>{t('totalExpenseStat')}</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#fde047' }}>
                {formatIndianCurrency(totalAmount)}
              </div>
              <div style={{ fontSize: '9px', color: '#cbd5e1' }}>नोंदी: {totalCount}</div>
            </div>

            {canManageExpenses && (
              <button
                className="btn btn-gold"
                onClick={() => setIsRecordModalOpen(true)}
                id="btn-open-record-expense"
              >
                <Plus size={16} />
                <span>{t('recordNewExpenseBtn')}</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Search & Category Filter Bar */}
      <div className="section-card" style={{ padding: '10px 14px', marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="input-wrapper">
            <span className="input-icon"><Search size={16} /></span>
            <input
              type="text"
              className="form-input"
              placeholder={t('searchExpensePlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="input-search-expenses"
            />
          </div>

          <div className="input-wrapper">
            <span className="input-icon"><Filter size={16} /></span>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              id="select-filter-category"
            >
              <option value="all">{t('allCategories')}</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Expense Records Table */}
      <ExpenseTable
        expenses={expenses}
        totalCount={totalCount}
        totalAmount={totalAmount}
        canManageExpenses={canManageExpenses}
        onPrintVoucher={handlePrintVoucher}
        onDeleteExpense={handleDeleteExpense}
      />

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onExpenseCreated={handleExpenseCreated}
      />
    </div>
  );
}
