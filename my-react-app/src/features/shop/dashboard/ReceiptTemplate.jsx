import React from 'react';
import { useTranslation } from 'react-i18next';

export const ReceiptTemplate = ({ cart, total, subtotal, tax, currency, paymentMethod, date, branchInfo, clientName, additionalDiscount, saleId }) => {
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
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              line-height: 1.2;
            }
            .receipt-container {
              width: 80mm; /* Standard thermal paper width */
              margin: 0 auto;
              padding: 5mm;
              box-sizing: border-box;
            }
            .dashed-line {
              border-bottom: 1px dashed #000;
              margin: 8px 0;
            }
            .bold { font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .flex-between { display: flex; justify-content: space-between; }
            @page {
              margin: 0;
              size: auto;
            }
          }
        `}
      </style>

      <div className="receipt-container">
        {/* LOGO */}
        <div className="text-center" style={{ marginBottom: '10px' }}>
          <img 
            src="/VentaWithoutBackground.png" 
            alt="MAX Logo" 
            style={{ 
              height: '50px', 
              objectFit: 'contain',
              filter: 'grayscale(100%) brightness(0.8)' // Better for black & white thermal printers
            }} 
          />
        </div>

        {/* HEADER INFORMATION */}
        <div className="text-center">
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>{t('shop.receipt.storeName')}</h2>
          <div style={{ fontSize: '11px', marginBottom: '8px' }}>
            <div className="bold">{branchInfo?.name || t('shop.receipt.mainBranch')}</div>
            <div>{new Date().toLocaleString()}</div>
            <div>ID: {saleId || '---'}</div>
          </div>
        </div>

        <div className="dashed-line" />

        {clientName && (
          <div style={{ marginBottom: '8px', fontSize: '11px' }}>
            <span className="bold">{t('shop.receipt.clientLabel')}:</span> {clientName}
          </div>
        )}

        {/* ITEMS LIST */}
        <div style={{ width: '100%', marginBottom: '10px' }}>
          <div className="flex-between bold" style={{ fontSize: '11px', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '4px' }}>
            <span>{t('common.name', 'Item')}</span>
            <span>{t('common.amount', 'Total')}</span>
          </div>
          
          {cart.map((item, index) => {
            const basePrice = Number(item.sellPrice || item.price || 0);
            const discount = Number(item.discount || 0);
            
            let displayPrice = basePrice;
            if (currency === 'IQD' && item.priceIQD) displayPrice = item.priceIQD;
            if (currency === 'EUR' && item.priceEUR) displayPrice = item.priceEUR;

            const finalPrice = displayPrice * (1 - discount / 100);
            const itemTotal = (finalPrice * item.qty).toLocaleString();

            return (
              <div key={index} style={{ marginBottom: '6px', fontSize: '11px' }}>
                <div className="bold">{item.name}</div>
                <div className="flex-between">
                  <span>
                    {item.qty} x {symbol}{displayPrice.toLocaleString()}{currencySuffix}
                    {discount > 0 && <span style={{ marginLeft: '4px', fontStyle: 'italic' }}>(-{discount}%)</span>}
                  </span>
                  <span className="bold">{symbol}{itemTotal}{currencySuffix}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dashed-line" />

        {/* TOTALS SECTION */}
        <div style={{ fontSize: '12px' }}>
          <div className="flex-between" style={{ marginBottom: '2px' }}>
            <span>Subtotal:</span>
            <span>{subtotal}</span>
          </div>

          {additionalDiscount > 0 && (
            <div className="flex-between" style={{ marginBottom: '2px' }}>
              <span>{t('shop.receipt.discountLabel')} ({additionalDiscount}%):</span>
              <span>Included</span>
            </div>
          )}

          {tax && tax !== '$0.00' && tax !== '0 IQD' && tax !== '€0.00' && (
            <div className="flex-between" style={{ marginBottom: '2px' }}>
              <span>Tax (5%):</span>
              <span>{tax}</span>
            </div>
          )}

          <div className="flex-between bold" style={{ fontSize: '16px', marginTop: '6px', borderTop: '1px solid #000', paddingTop: '4px' }}>
            <span>{t('shop.receipt.totalLabel', { currency })}</span>
            <span>{total}</span>
          </div>
        </div>

        <div className="dashed-line" />

        {/* PAYMENT DETAILS */}
        <div style={{ fontSize: '11px', marginBottom: '10px' }}>
          <div className="flex-between">
            <span>{t('shop.receipt.paymentLabel')}:</span>
            <span className="bold">{paymentMethod || 'Cash'}</span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center" style={{ marginTop: '15px', fontSize: '11px' }}>
          <div className="bold">{t('shop.receipt.thankYou')}</div>
          <div>{t('shop.receipt.returnsPolicy')}</div>
          <div style={{ marginTop: '8px', border: '1px solid #000', padding: '4px', display: 'inline-block' }}>
            {t('shop.receipt.customerCopy')}
          </div>
        </div>

        {/* PRINTER BOTTOM MARGIN */}
        <div style={{ height: '20px' }} />
      </div>
    </div>
  );
};
