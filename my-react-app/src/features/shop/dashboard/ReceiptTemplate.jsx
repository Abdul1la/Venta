import React from 'react';
import { useTranslation } from 'react-i18next';

export const ReceiptTemplate = ({ cart, total, currency, paymentMethod, date, branchInfo, clientName, additionalDiscount }) => {
  const { t } = useTranslation();

  const getCurrencySymbol = (cur) => {
    if (cur === 'USD') return '$';
    if (cur === 'EUR') return '€';
    return '';
  };

  const symbol = getCurrencySymbol(currency);
  const currencySuffix = currency === 'IQD' ? ' IQD' : '';

  return (
    <div id="receipt-print-area" style={{ display: 'none' }}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-print-area, #receipt-print-area * {
              visibility: visible;
            }
            #receipt-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
              color: black;
              background: white;
              font-family: 'Courier New', monospace;
              font-size: 12px;
            }
            @page {
              margin: 0;
              size: auto;
            }
          }
        `}
      </style>

      <div style={{ padding: '20px', maxWidth: '300px', margin: '0 auto', textAlign: 'center' }}>
        {/* HEADER */}
        <h2 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>{t('shop.receipt.storeName')}</h2>
        <div style={{ marginBottom: '10px' }}>
          <div>{t('shop.receipt.branchLabel')}: {branchInfo?.name || t('shop.receipt.mainBranch')}</div>
          <div>{new Date().toLocaleString()}</div>
        </div>

        {clientName && (
          <div style={{ textAlign: 'left', marginBottom: '5px' }}>
            <span style={{ fontWeight: 'bold' }}>{t('shop.receipt.clientLabel')}:</span> {clientName}
          </div>
        )}

        <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

        {/* ITEMS */}
        <div style={{ textAlign: 'left' }}>
          {cart.map((item, index) => {
            const itemPrice = Number(item.sellPrice || item.price || 0);
            // If currency is not USD, we might need the specific currency price
            let displayPrice = itemPrice;
            if (currency === 'IQD' && item.priceIQD) displayPrice = item.priceIQD;
            if (currency === 'EUR' && item.priceEUR) displayPrice = item.priceEUR;

            const itemTotal = (displayPrice * item.qty).toLocaleString();

            return (
              <div key={index} style={{ marginBottom: '5px' }}>
                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('shop.receipt.itemLine', { qty: item.qty, price: `${symbol}${displayPrice.toLocaleString()}${currencySuffix}` })}</span>
                  <span>{symbol}{itemTotal}{currencySuffix}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

        {/* TOTALS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
          <span>{t('shop.receipt.totalLabel', { currency })}</span>
          <span>{total}</span>
        </div>

        {additionalDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '12px', color: '#666' }}>
            <span>{t('shop.receipt.discountLabel')}</span>
            <span>-{additionalDiscount}%</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '12px' }}>
          <span>{t('shop.receipt.paymentLabel')}</span>
          <span>{paymentMethod}</span>
        </div>

        <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }} />

        {/* FOOTER */}
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <div>{t('shop.receipt.thankYou')}</div>
          <div>{t('shop.receipt.returnsPolicy')}</div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {t('shop.receipt.customerCopy')}
        </div>
      </div>
    </div>
  );
};
