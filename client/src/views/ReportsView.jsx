import React, { useState, useEffect } from 'react';
import { Download, Printer, PieChart, CreditCard, TrendingUp, Clock, TrendingDown, Wallet } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { apiRequest } from '../utils/api';
import HeroBanner from '../components/layout/HeroBanner';
import StatCard from '../components/common/StatCard';
import BreakdownCard from '../components/reports/BreakdownCard';
import { formatIndianCurrency } from '../utils/numberToWords';
import { formatDate } from '../utils/dateUtils';

export default function ReportsView() {
  const { t } = useLanguage();
  const { stats } = useData();

  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [paymentModeBreakdown, setPaymentModeBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBreakdowns() {
      try {
        setLoading(true);
        const [catRes, payRes] = await Promise.all([
          apiRequest('/reports/category-breakdown'),
          apiRequest('/reports/payment-modes')
        ]);
        setCategoryBreakdown(catRes.categories || []);
        setPaymentModeBreakdown(payRes.payment_modes || []);
      } catch (err) {
        console.error('Fetch report breakdowns error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBreakdowns();
  }, []);

  const handleDownloadCsv = (type) => {
    const token = localStorage.getItem('ekdant_auth_token');
    const url = `/api/reports/export/${type}`;
    
    // Create an anchor link to trigger download with auth
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Ekdant_Mandal_${type.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('CSV download failed.'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* 1. Hero Banner (Emerald Green) */}
      <HeroBanner
        theme="green"
        tag="EKDANT MITRA MANDAL UNCHGAON"
        title={t('reportsTitle')}
        subtitle={t('reportsSub')}
        actions={
          <>
            <button
              className="btn btn-gold"
              onClick={() => handleDownloadCsv('receipts')}
              id="btn-export-receipts-csv"
            >
              <Download size={14} />
              <span>{t('receiptsCsvBtn')}</span>
            </button>

            <button
              className="btn btn-dark"
              onClick={() => handleDownloadCsv('expenses')}
              id="btn-export-expenses-csv"
            >
              <Download size={14} />
              <span>{t('expensesCsvBtn')}</span>
            </button>

            <button
              className="btn btn-outline-white"
              onClick={handlePrint}
              id="btn-print-report"
            >
              <Printer size={14} />
              <span>{t('printReportBtn')}</span>
            </button>
          </>
        }
      />

      {/* 2. Summary Stat Cards Grid */}
      <div className="stat-cards-grid">
        <StatCard
          title={t('totalPaidCollection')}
          amount={stats.total_paid}
          countText={`${stats.paid_count} ${t('paidReceiptsCount')}`}
          highlightText="100% Verified"
          highlightColor="green"
          icon={TrendingUp}
          iconColor="green"
        />

        <StatCard
          title={t('totalUnpaid')}
          amount={stats.total_unpaid}
          countText={`${stats.unpaid_count} ${t('unpaidReceiptsCount')}`}
          highlightText="Pending Pledges"
          highlightColor="amber"
          icon={Clock}
          iconColor="amber"
        />

        <StatCard
          title={t('totalExpenses')}
          amount={stats.total_expenses}
          countText={`${stats.expense_count} नोंदी`}
          highlightText={`${stats.budget_used_pct}% Utilized`}
          highlightColor="red"
          icon={TrendingDown}
          iconColor="red"
        />

        <StatCard
          title={t('remainingBalance')}
          amount={stats.net_balance}
          countText="Net Mandap Fund"
          highlightText={t('safePill')}
          highlightColor="blue"
          icon={Wallet}
          iconColor="blue"
        />
      </div>

      {/* 3. Category Breakdown Card */}
      <BreakdownCard
        title={t('categoryBreakdownTitle')}
        icon={PieChart}
        items={categoryBreakdown}
        type="category"
      />

      {/* 4. Payment Modes Breakdown Card */}
      <BreakdownCard
        title={t('paymentModesTitle')}
        icon={CreditCard}
        items={paymentModeBreakdown}
        type="payment"
      />
    </div>
  );
}
