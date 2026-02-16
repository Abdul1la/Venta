import { ArrowLeft, Calendar, Printer, DollarSign, TrendingUp } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { salesService } from '../../shop/services/salesService';
import { branchService } from '../services/branchService';



const MonthlyReceiptsView = () => {
  const { t, i18n } = useTranslation();
  const MONTHS = t('common.months', { returnObjects: true }) || [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const { branchId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();

  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState(null);

  // Generate year options (current year and 2 previous)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    const loadBranchName = async () => {
      try {
        const branches = await branchService.getBranches();
        const branch = branches.find(b => b.id === branchId);
        setBranchName(branch?.name || 'Branch');
      } catch (e) {
        console.error('Failed to load branch name', e);
      }
    };
    loadBranchName();
  }, [branchId]);

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const data = await salesService.getMonthlySales(branchId, selectedYear, selectedMonth);
        setReportData(data);
      } catch (error) {
        console.error('Failed to load monthly report', error);
      }
      setLoading(false);
    };
    loadReport();
  }, [branchId, selectedYear, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount, currency) => {
    if (currency === 'USD') return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (currency === 'IQD') return `${amount.toLocaleString()} IQD`;
    if (currency === 'EUR') return `€${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return amount.toLocaleString();
  };

  return (
    <>
      {/* PRINT STYLES */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #monthly-report-print, #monthly-report-print * { visibility: visible; }
            #monthly-report-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              color: black;
              padding: 20px;
            }
            .no-print { display: none !important; }
            @page { margin: 10mm; }
          }
        `}
      </style>

      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* HEADER */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => navigate(`/warehouse/branches/${branchId}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.receipts.title')}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)' }}>{branchName}</p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="no-print" style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--color-text-secondary)" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
            >
              {MONTHS.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: '#007AFF', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
            }}
          >
            <Printer size={18} />
            {t('warehouse.branches.receipts.printReport')}
          </button>
        </div>

        {/* PRINTABLE CONTENT */}
        <div id="monthly-report-print" ref={printRef}>
          {/* Print Header (only visible when printing) */}
          <div style={{ display: 'none' }} className="print-only">
            <h1 style={{ textAlign: 'center', marginBottom: '5px' }}>{t('shop.receipt.storeName')}</h1>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>{branchName} - Monthly Report</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>{t('common.loading')}</div>
          ) : (
            <>
              {/* SUMMARY CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: 'var(--color-bg-app)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <TrendingUp size={24} color="#007AFF" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.receipts.totalSales')}</span>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{reportData?.salesCount || 0}</div>
                </div>

                <div style={{ background: 'var(--color-bg-app)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <DollarSign size={24} color="#34C759" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.receipts.usdRevenue')}</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#34C759' }}>
                    {formatCurrency(reportData?.totalUSD || 0, 'USD')}
                  </div>
                </div>

                <div style={{ background: 'var(--color-bg-app)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <DollarSign size={24} color="#007AFF" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.receipts.iqdRevenue')}</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#007AFF' }}>
                    {formatCurrency(reportData?.totalIQD || 0, 'IQD')}
                  </div>
                </div>

                <div style={{ background: 'var(--color-bg-app)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <DollarSign size={24} color="#FF9500" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t('warehouse.branches.receipts.eurRevenue')}</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#FF9500' }}>
                    {formatCurrency(reportData?.totalEUR || 0, 'EUR')}
                  </div>
                </div>
              </div>

              {/* DAILY BREAKDOWN TABLE */}
              <div style={{ background: 'var(--color-bg-card)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{t('warehouse.branches.receipts.dailyBreakdown')}</h3>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-app)' }}>
                      <th style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'right' : 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('common.date')}</th>
                      <th style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '13px' }}># {t('warehouse.branches.reports')}</th>
                      <th style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '13px' }}>USD</th>
                      <th style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '13px' }}>IQD</th>
                      <th style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '13px' }}>EUR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.dailyBreakdown?.length > 0 ? (
                      reportData.dailyBreakdown.map((day, idx) => (
                        <tr key={day.date} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '14px 20px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                            {new Date(day.date).toLocaleDateString(i18n.language === 'ku' ? 'ku-IQ' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>{day.count}</td>
                          <td style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', color: 'var(--color-chart-green)' }}>{formatCurrency(day.USD, 'USD')}</td>
                          <td style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', color: 'var(--color-chart-blue)' }}>{formatCurrency(day.IQD, 'IQD')}</td>
                          <td style={{ padding: '14px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', color: 'var(--color-chart-orange)' }}>{formatCurrency(day.EUR, 'EUR')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          {t('warehouse.branches.receipts.noSales')} {MONTHS[selectedMonth - 1]} {selectedYear}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {reportData?.dailyBreakdown?.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#1C1C1E', color: '#fff', fontWeight: 600 }}>
                        <td style={{ padding: '16px 20px' }}>{t('common.total', 'TOTAL')}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>{reportData?.salesCount || 0}</td>
                        <td style={{ padding: '16px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', color: '#34C759' }}>{formatCurrency(reportData?.totalUSD || 0, 'USD')}</td>
                        <td style={{ padding: '16px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', color: '#007AFF' }}>{formatCurrency(reportData?.totalIQD || 0, 'IQD')}</td>
                        <td style={{ padding: '16px 20px', textAlign: i18n.dir() === 'rtl' ? 'left' : 'right', color: '#FF9500' }}>{formatCurrency(reportData?.totalEUR || 0, 'EUR')}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Print Footer */}
              <div style={{ marginTop: '40px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                {t('warehouse.branches.receipts.generatedOn')} {new Date().toLocaleString(i18n.language === 'ku' ? 'ku-IQ' : 'en-US')}
              </div>
            </>
          )}
        </div>
      </div >
    </>
  );
};

export default MonthlyReceiptsView;
