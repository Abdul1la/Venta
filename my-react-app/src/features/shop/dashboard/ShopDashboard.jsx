import { useState, useEffect, useRef } from 'react';
import { Calculator, X, Search, QrCode, CreditCard, Banknote, ShoppingBag, Delete, Check, Minus, Plus, Trash2, User, Percent } from 'lucide-react';
import { useNotification } from '../../../components/ui/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { inventoryService } from '../../warehouse/inventory/inventoryService';
import { salesService } from '../services/salesService';
import { ReceiptTemplate } from './ReceiptTemplate';
import { notificationService } from '../../common/services/notificationService'; // Ensure this path is correct relative to ShopDashboard
import { settingsService } from '../../common/services/settingsService';

import { useAuth } from '../../../features/auth/AuthContext';
import { useTheme } from '../../../components/ui/ThemeContext';

const ShopDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  // --- STATE ---
  const [cart, setCart] = useState([]);
  const [scanInput, setScanInput] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [currentBranchId, setCurrentBranchId] = useState(user?.branchId || '1');
  const [currentBranchName, setCurrentBranchName] = useState('');

  // New Fields
  const [clientName, setClientName] = useState('');
  const [currency, setCurrency] = useState('IQD'); // Default to IQD as requested
  const [additionalDiscount, setAdditionalDiscount] = useState(''); // Additional discount percentage
  const [lastSaleId, setLastSaleId] = useState(null); // To show Invoice Number on receipt


  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, IQD: 1500, EUR: 0.92 });


  const openPaymentModal = () => setShowPaymentModal(true);

  const { showNotification } = useNotification();

  // Default fallback if fetch fails
  const DEFAULT_METHODS = [
    { id: 'cash', name: t('shop.payment.cash'), icon: '💵', currency: 'USD' },
    { id: 'card', name: t('shop.payment.card'), icon: '💳', currency: 'USD' }
  ];

  const displayBranchName = currentBranchName || t('shop.pos.loadingBranch');

  // Ref for auto-focusing the hidden input
  const inputRef = useRef(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { branchService } = await import('../../warehouse/services/branchService');

        let activeBranchId = user?.branchId;

        // If no branch assigned to user, fetch the first available branch
        if (!activeBranchId) {
          const branches = await branchService.getBranches();
          if (branches && branches.length > 0) {
            activeBranchId = branches[0].id;
          } else {
            activeBranchId = '1'; // Ultimate fallback
          }
        }

        console.log("Loading POS settings for Branch ID:", activeBranchId);
        setCurrentBranchId(activeBranchId);

        // Find branch name for display
        const branches = await branchService.getBranches();
        const activeBranch = branches.find(b => b.id === activeBranchId);
        setCurrentBranchName(activeBranch ? activeBranch.name : t('shop.pos.branchFallback', { id: activeBranchId }));

        const methods = await branchService.getPaymentConfig(activeBranchId);
        if (methods && methods.length > 0) {
          setPaymentMethods(methods);
          // Find 'Cash' (case insensitive) or fallback to first
          const defaultMethod = methods.find(m => m.name.toLowerCase().includes('cash')) || methods[0];
          setSelectedMethod(defaultMethod);
        } else {
          setPaymentMethods(DEFAULT_METHODS);
          setSelectedMethod(DEFAULT_METHODS[0]);
        }
      } catch (e) {
        console.error("Failed to load payment methods", e);
        setPaymentMethods(DEFAULT_METHODS);
        setSelectedMethod(DEFAULT_METHODS[0]);
      }
    };
    loadConfig();

    // Listen to real-time exchange rate changes
    const unsubscribeRates = settingsService.onExchangeRatesChange((rates) => {
      setExchangeRates(rates);
    });

    inputRef.current?.focus();
    const handleClickAnywhere = (e) => {
      // If an input, textarea or our modal is open, don't steal focus
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || isDetailsModalOpen) {
        return;
      }

      // Only autofocus if the user clicked on structural elements (not other interactives)
      const isInteractive = e.target.closest('button, a, input, textarea, select, .modal-content');
      if (!isInteractive) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('click', handleClickAnywhere);
    return () => {
      window.removeEventListener('click', handleClickAnywhere);
      unsubscribeRates();
    };
  }, []);

  // --- HANDLERS ---
  const handleScan = async (e) => {
    e.preventDefault();
    const barcode = scanInput;
    if (!barcode) return;

    setScanning(true);
    setScanInput(''); // Clear immediately for UX

    try {
      const product = await inventoryService.getProductByBarcode(barcode, currentBranchId);

      if (product) {
        if (product.stock <= 0) {
          playSound('error');
          alert(t('shop.pos.outOfStock', { name: product.name }));
          return;
        }

        const safeProd = {
          ...product,
          price: Number(product.price || 0),
          sellPrice: Number(product.sellPrice || product.price || 0),
          discount: Number(product.discount || 0),
          priceIQD: Number(product.priceIQD || product.price * exchangeRates.IQD || 0),
          priceEUR: Number(product.priceEUR || product.price * exchangeRates.EUR || 0)
        };
        addToCart(safeProd);
        setLastScanned(safeProd);
        playSound('success');
      } else {
        playSound('error');
        alert(t('shop.pos.productNotFound'));
      }
    } catch (err) {
      console.error(err);
      playSound('error');
    } finally {
      setScanning(false);
      inputRef.current?.focus(); // Refocus
    }
  };

  const addToCart = (product) => {
    // Sanitize data types
    const safeProduct = {
      ...product,
      price: Number(product.price || 0),
      sellPrice: Number(product.sellPrice || product.price || 0),
      discount: Number(product.discount || 0),
      priceIQD: Number(product.priceIQD || 0),
      priceEUR: Number(product.priceEUR || 0)
    };

    setCart(prev => {
      const existing = prev.find(item => item.barcode === product.barcode);
      if (existing) {
        return prev.map(item => item.barcode === product.barcode ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...safeProduct, qty: 1 }];
    });
  };

  const removeFromCart = (barcode) => {
    setCart(prev => prev.filter(item => item.barcode !== barcode));
  };

  const updateQty = (barcode, change) => {
    setCart(prev => prev.map(item => {
      if (item.barcode === barcode) {
        const newQty = item.qty + change;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const playSound = (type) => {
    // Console log for now
  };

  const handleCompleteSale = async (status = 'COMPLETED', paymentData = null) => {
    if (cart.length === 0 || (!selectedMethod && status === 'COMPLETED' && !paymentData)) return; // Added !paymentData check

    setProcessing(true);
    try {
      // 1. Deduct Stock
      await inventoryService.processSale(cart);

      // 2. Prepare Payment Data
      let finalPayments = [];
      let finalChange = null;

      if (paymentData) {
        // Use data from Payment Modal
        finalPayments = paymentData.payments;
        finalChange = paymentData.change;
      } else if (status === 'COMPLETED') {
          // Quick Charge Default
          const totalAmount = currency === 'IQD' ? totals.iqd : (currency === 'EUR' ? totals.eur : grandTotalUSD);
          finalPayments = [{
              id: Date.now(),
              amount: totalAmount,
              currency: currency,
              method: selectedMethod?.name || 'Cash'
          }];
      }

      // 3. Record Sale
      const saleData = {
        items: cart,
        total: currency === 'IQD' ? totals.iqd : (currency === 'EUR' ? totals.eur : grandTotalUSD),
        currency: currency, 
        
        // Detailed Payment Info
        payments: finalPayments,
        change: finalChange,

        clientName: clientName || '', 
        additionalDiscount: Number(additionalDiscount) || 0,
        paymentMethod: status === 'ORDER' ? 'Pay Later' : (finalPayments.length > 1 ? 'Mixed' : finalPayments[0]?.method),
        paymentMethodId: status === 'ORDER' ? 'order' : selectedMethod?.id, // Added optional chaining
        status: status, 
        branchId: currentBranchId,
        adminId: user?.id || 'staff',
        adminName: user?.name || user?.username || 'Staff',
      };

      const saleId = await salesService.createSale(saleData, exchangeRates); // Pass exchangeRates
      setLastSaleId(saleId); // Store for Receipt

      const successMsg = status === 'ORDER' ? t('shop.pos.orderSaved') : t('shop.pos.saleCompleted');
      console.log(`${successMsg} Total: ${grandTotalUSD}`);
      playSound('success');

      // Reset UI
      setCart([]);
      setLastScanned(null);
      setClientName('');
      setAdditionalDiscount('');
      setShowPaymentModal(false); // Close payment modal after successful sale

      const displayTotal = currency === 'IQD' ? formatIQD(totals.iqd) : (currency === 'EUR' ? formatEUR(totals.eur) : formatUSD(grandTotalUSD));
      showNotification(t('shop.pos.saleSuccess', { message: successMsg, total: displayTotal }), 'success');

      // --- TRIGGER PRINT if Sale ---
      if (status === 'COMPLETED') {
        setTimeout(() => {
          window.print();
        }, 500);
      }

    } catch (error) {
      showNotification(error.message, 'error');
      playSound('error');
    } finally {
      setProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleCloseRegister = async () => {
    if (!window.confirm(t('shop.pos.closeRegisterConfirm'))) return;

    try {
      // In a real app we'd fetch actual sales from DB for the day to be accurate
      // For now, we'll just notify that the shift is closed. 
      // Ideally: const dailyStats = await salesService.getBranchStats(branchId);

      await notificationService.createNotification(
        'SHIFT_REPORT',
        t('shop.pos.shiftReportTitle'),
        t('shop.pos.shiftReportMessage', { name: user?.name || t('shop.pos.staffFallback') }),
        {
          closer: user?.name,
          time: new Date().toISOString()
        },
        currentBranchId
      );

      showNotification(t('shop.pos.closeRegisterSuccess'), "success");
    } catch (e) {
      console.error(e);
      showNotification(t('shop.pos.closeRegisterError'), "error");
    }
  };

  // --- CALCULATIONS ---
  // Calculates totals using the fixed prices set by the owner
  const rawTotals = cart.reduce((acc, item) => {
    const discount = (1 - (Number(item.discount) || 0) / 100);
    const priceUSD = Number(item.sellPrice || item.price || 0);
    const priceIQD = Number(item.priceIQD || 0);
    const priceEUR = Number(item.priceEUR || 0);

    acc.usd += (priceUSD * discount) * item.qty;
    acc.iqd += (priceIQD * discount) * item.qty;
    acc.eur += (priceEUR * discount) * item.qty;

    return acc;
  }, { usd: 0, iqd: 0, eur: 0 });

  // Apply Additional Discount
  const discountMultiplier = 1 - ((Number(additionalDiscount) || 0) / 100);

  const totals = {
    usd: rawTotals.usd * discountMultiplier,
    iqd: rawTotals.iqd * discountMultiplier,
    eur: rawTotals.eur * discountMultiplier
  };

  const taxUSD = totals.usd * 0.05;
  const grandTotalUSD = totals.usd + taxUSD;

  // Formatting helpers
  const formatUSD = (v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const formatIQD = (v) => `${v.toLocaleString()} IQD`;
  const formatEUR = (v) => `€${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Main Component Return Wrapper
  return (
    <div className="layout-container" style={{ position: 'relative', height: '100vh', display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden', background: 'var(--color-bg-app)' }}>
      
      {/* LEFT COLUMN: ACTIVE CART (65%) */}
      <div style={{ position: 'relative', zIndex: 2, flex: '65%', padding: '24px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        
        {/* Scoped Background for Left Column */}
        <div style={{ position: 'absolute', inset: 0, zIndex: -1, borderRadius: 'inherit', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: '#fff' }}></div>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: "url('/Venta.png')",
              backgroundSize: '500px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: isDarkMode ? 'rgba(20, 20, 25, 0.4)' : 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(1px)'
            }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
          <form onSubmit={handleScan} style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: '#71717a' }} />
            <input
              ref={inputRef}
              className="scanner-input"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder={t('shop.pos.scanPlaceholder', { branch: displayBranchName })}
              style={{
                width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px',
                background: isDarkMode ? 'rgba(30,30,35,0.6)' : 'rgba(255,255,255,0.8)', 
                backdropFilter: 'blur(10px)', 
                border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--color-border)', 
                color: 'var(--color-text-primary)', fontSize: '16px',
                outline: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <div style={{ position: 'absolute', right: '12px', top: '14px', color: '#555', fontSize: '11px', fontWeight: 600, background: isDarkMode ? '#111' : '#eee', padding: '2px 8px', borderRadius: '4px' }}>
              {displayBranchName}
            </div>
          </form>

          {/* LARGE LAST ITEM DISPLAY */}
          {lastScanned && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              key={lastScanned.barcode}
              style={{
                background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
                padding: '12px 24px', borderRadius: '16px',
                display: 'flex', alignItems: 'center', gap: '20px',
                boxShadow: '0 10px 25px -5px rgba(0, 122, 255, 0.3)'
              }}
            >
              {lastScanned.imageUrl && (
                <img
                  src={lastScanned.imageUrl}
                  alt={t('shop.pos.lastScannedAlt')}
                  style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}
                />
              )}
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 600, letterSpacing: '0.5px' }}>{t('shop.pos.lastScanned')}</div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{lastScanned.name}</div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                {lastScanned.discount > 0 && (
                  <div style={{ fontSize: '14px', opacity: 0.7, textDecoration: 'line-through' }}>
                    {currency === 'IQD' 
                      ? formatIQD(lastScanned.priceIQD) 
                      : (currency === 'EUR' ? formatEUR(lastScanned.priceEUR) : formatUSD(lastScanned.price))}
                  </div>
                )}
                <div style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' }}>
                  {currency === 'IQD'
                    ? formatIQD(lastScanned.priceIQD * (1 - (lastScanned.discount || 0) / 100))
                    : (currency === 'EUR' 
                        ? formatEUR(lastScanned.priceEUR * (1 - (lastScanned.discount || 0) / 100))
                        : formatUSD(lastScanned.price * (1 - (lastScanned.discount || 0) / 100))
                      )
                  }
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Cart List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.barcode}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', marginBottom: '12px', 
                  background: isDarkMode ? 'rgba(30, 30, 35, 0.6)' : 'rgba(255, 255, 255, 0.8)', 
                  backdropFilter: 'blur(10px)', borderRadius: '16px',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: '48px', height: '48px', background: 'var(--color-bg-app)', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                  }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ShoppingBag size={20} color="#a1a1aa" />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', color: '#f4f4f5' }}>{item.name}</div>
                    <div style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '2px' }}>
                      #{item.barcode} •
                      {item.discount > 0 ? (
                        <span>
                          <span style={{ textDecoration: 'line-through', marginRight: '6px' }}>
                            {currency === 'IQD' ? formatIQD(item.priceIQD) : (currency === 'EUR' ? formatEUR(item.priceEUR) : formatUSD(item.price))}
                          </span>
                          <span style={{ color: '#34C759', fontWeight: 'bold' }}>
                            {currency === 'IQD' 
                              ? formatIQD(item.priceIQD * (1 - item.discount / 100))
                              : (currency === 'EUR' 
                                  ? formatEUR(item.priceEUR * (1 - item.discount / 100))
                                  : formatUSD(item.price * (1 - item.discount / 100))
                                )
                            }
                          </span>
                        </span>
                      ) : (
                         ` ${currency === 'IQD' ? formatIQD(item.priceIQD) : (currency === 'EUR' ? formatEUR(item.priceEUR) : formatUSD(item.price))}`
                      )}
                      {t('shop.pos.each')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                  {/* Qty Control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#000', borderRadius: '12px', padding: '4px', border: '1px solid #27272a' }}>
                    <button onClick={() => updateQty(item.barcode, -1)} className="btn-icon-small" style={{ width: '32px', height: '32px' }}><Minus size={16} /></button>
                    <span style={{ fontWeight: 'bold', width: '32px', textAlign: 'center', fontSize: '15px' }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.barcode, 1)} className="btn-icon-small" style={{ width: '32px', height: '32px' }}><Plus size={16} /></button>
                  </div>

                  <div style={{ fontWeight: '700', fontSize: '18px', width: '80px', textAlign: 'right', color: '#fff' }}>
                    {currency === 'IQD' 
                      ? formatIQD(((item.priceIQD * (1 - (item.discount || 0) / 100)) * item.qty))
                      : (currency === 'EUR'
                          ? formatEUR(((item.priceEUR * (1 - (item.discount || 0) / 100)) * item.qty))
                          : formatUSD(((item.price * (1 - (item.discount || 0) / 100)) * item.qty))
                        )
                    }
                  </div>

                  <button
                    onClick={() => removeFromCart(item.barcode)}
                    style={{
                      background: 'rgba(255, 69, 58, 0.1)', border: 'none', borderRadius: '8px',
                      color: '#FF453A', cursor: 'pointer', padding: '8px', display: 'flex'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* RIGHT COLUMN: CONTROLS & TOTALS (35%) */}
      <div style={{ 
        zIndex: 2, flex: '35%', 
        background: isDarkMode ? 'rgba(20, 20, 25, 0.85)' : 'var(--color-bg-card)', 
        backdropFilter: 'blur(20px)', padding: '24px', display: 'flex', flexDirection: 'column', 
        borderLeft: '1px solid var(--color-border)', overflowY: 'auto' 
      }}>

        {/* Customer Details Summary Card */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, letterSpacing: '1px' }}>
              {t('shop.receipt.clientLabel')} & {t('shop.receipt.discountLabel')}
            </h3>
            <button
              onClick={() => setIsDetailsModalOpen(true)}
              style={{
                background: '#007AFF15', border: '1px solid #007AFF30',
                color: '#007AFF', padding: '4px 10px', borderRadius: '8px',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              {clientName || additionalDiscount ? t('common.edit') : t('common.add')}
            </button>
          </div>

          <div style={{
            background: 'var(--color-bg-app)', borderRadius: '12px', padding: '12px',
            border: '1px solid var(--color-border)', display: 'flex', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{t('shop.receipt.clientLabel')}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: clientName ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                {clientName || t('common.none')}
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--color-border)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{t('shop.receipt.discountLabel')}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: Number(additionalDiscount) > 0 ? '#34C759' : 'var(--color-text-secondary)' }}>
                {additionalDiscount ? `${additionalDiscount}%` : '0%'}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ marginBottom: 'auto' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, letterSpacing: '1px', marginBottom: '12px' }}>{t('shop.pos.selectPaymentMethod')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {paymentMethods.map(method => (
              <PaymentButton
                key={method.id}
                label={method.name}
                icon={method.icon}
                color={method.currency === 'USD' ? '#34C759' : '#007AFF'}
                isSelected={selectedMethod?.id === method.id}
                onClick={() => setSelectedMethod(method)}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        </div>

        {/* Totals Section */}
        <div style={{ marginTop: '24px', background: '#09090b', borderRadius: '20px', padding: '20px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#a1a1aa', fontSize: '13px' }}>
            <span>{t('shop.pos.subtotal', { currency: 'USD' })}</span>
            <span>{formatUSD(totals.usd)}</span>
          </div>

          <div style={{ height: '1px', background: '#27272a', marginBottom: '16px' }} />

          {/* CURRENCY SELECTION BUTTONS */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            {/* IQD Button (Default) */}
            <button
              onClick={() => setCurrency('IQD')}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px',
                background: currency === 'IQD' ? 'rgba(0, 122, 255, 0.2)' : 'var(--color-bg-app)',
                border: currency === 'IQD' ? '2px solid #007AFF' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px', fontWeight: 600 }}>{t('common.iqd')}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: currency === 'IQD' ? '#007AFF' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{formatIQD(totals.iqd)}</div>
            </button>

            {/* USD Button */}
            <button
              onClick={() => setCurrency('USD')}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px',
                background: currency === 'USD' ? 'rgba(52, 199, 89, 0.2)' : 'var(--color-bg-app)',
                border: currency === 'USD' ? '2px solid #34C759' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px', fontWeight: 600 }}>{t('common.usd')}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: currency === 'USD' ? '#34C759' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{formatUSD(grandTotalUSD)}</div>
            </button>

            {/* EUR Button */}
            <button
              onClick={() => setCurrency('EUR')}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px',
                background: currency === 'EUR' ? 'rgba(255, 149, 0, 0.2)' : 'var(--color-bg-app)',
                border: currency === 'EUR' ? '2px solid #FF9500' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px', fontWeight: 600 }}>{t('common.eur')}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: currency === 'EUR' ? '#FF9500' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{formatEUR(totals.eur)}</div>
            </button>
          </div>

          {/* QUICK ACTIONS ROW */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0 || processing}
              style={{
                 flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                 background: '#FF9500', color: '#FFF', fontWeight: 700, fontSize: '13px',
                 cursor: cart.length > 0 ? 'pointer' : 'not-allowed', opacity: cart.length > 0 ? 1 : 0.6,
                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Banknote size={16} />
              {t('shop.pos.foreignMixed', 'Foreign/Mixed')}
            </button>
             <button
              onClick={() => handleCompleteSale('ORDER')}
              disabled={cart.length === 0 || processing}
              style={{ flex: 1, padding: '14px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '12px', color: '#d4d4d8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('shop.pos.saveAsOrder')}
            </button>
          </div>

          {/* MAIN CHARGE BUTTON (QUICK PAY) */}
          <button
            onClick={() => handleCompleteSale('COMPLETED')}
            disabled={cart.length === 0 || processing}
            style={{
              width: '100%', padding: '20px', borderRadius: '16px', border: 'none',
              background: cart.length > 0 ? 'linear-gradient(135deg, #007AFF 0%, #0066CC 100%)' : '#27272a',
              color: cart.length > 0 ? '#FFF' : '#71717a',
              fontSize: '18px', fontWeight: '800',
              cursor: cart.length > 0 && !processing ? 'pointer' : 'not-allowed',
              opacity: cart.length > 0 && !processing ? 1 : 0.8,
              transition: 'all 0.2s',
              boxShadow: cart.length > 0 ? '0 10px 30px -10px rgba(0,122,255,0.5)' : 'none',
              transform: cart.length > 0 ? 'translateY(0)' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            }}
          >
             <div>{t('shop.pos.quickCharge', 'Quick Charge')}</div>
             <div style={{ fontSize: '13px', fontWeight: 500, opacity: 0.8 }}>
               {currency === 'IQD' ? formatIQD(totals.iqd) : (currency === 'EUR' ? formatEUR(totals.eur) : formatUSD(grandTotalUSD))}
             </div>
          </button>

          <div style={{ marginTop: '12px' }}>
            <button
              onClick={() => { setCart([]); }}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '12px', color: '#FF453A', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              {t('shop.pos.voidTransaction')}
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOMER DETAILS MODAL */}
      <AnimatePresence>
        {isDetailsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: '20px'
            }}
            onClick={() => setIsDetailsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-content"
              style={{
                background: 'var(--color-bg-card)', padding: '32px', borderRadius: '24px',
                width: '100%', maxWidth: '450px', border: '1px solid var(--color-border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{t('shop.pos.clientDetails')}</h2>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  style={{ background: 'var(--color-bg-app)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                  {t('shop.receipt.clientLabel')}
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={t('shop.pos.clientPlaceholder')}
                    autoFocus
                    style={{
                      width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px',
                      background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                  {t('shop.receipt.discountLabel')} (%)
                </label>
                <div style={{ position: 'relative' }}>
                  <Percent size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={additionalDiscount}
                    onChange={(e) => setAdditionalDiscount(e.target.value)}
                    placeholder={t('shop.pos.discountPlaceholder')}
                    style={{
                      width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px',
                      background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
                  color: '#FFF', fontWeight: 700, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)'
                }}
              >
                {t('common.save')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={currency === 'IQD' ? totals.iqd : (currency === 'EUR' ? totals.eur : grandTotalUSD)}
        currency={currency}
        exchangeRates={exchangeRates} // Pass exchangeRates
        onConfirm={(data) => {
          // This receives { payments, change } from the modal
          // We need to pass this to handleCompleteSale somehow, or call a specific function
          // Let's modify handleCompleteSale to accept optional payment data
          handleCompleteSale('COMPLETED', data);
        }}
      />

      <ReceiptTemplate
        cart={cart}
        total={currency === 'IQD' ? formatIQD(totals.iqd) : (currency === 'EUR' ? formatEUR(totals.eur) : formatUSD(grandTotalUSD))}
        currency={currency}
        paymentMethod={selectedMethod?.name}
        clientName={clientName}
        additionalDiscount={additionalDiscount}
      />

      {/* Footer / Close Register */}
      <div style={{ position: 'fixed', bottom: '24px', right: '430px', zIndex: 10 }}>
        <button
          onClick={handleCloseRegister}
          style={{
            background: isDarkMode ? '#27272a' : '#fff', 
            border: isDarkMode ? '1px solid #3f3f46' : '1px solid var(--color-border)', 
            borderRadius: '50px',
            padding: '12px 24px', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff453a' }}></div>
          {t('shop.pos.closeRegister')}
        </button>
      </div>
    </div >
  );
};

// Updated Payment Button Component
const PaymentButton = ({ label, icon, color, isSelected, onClick, isDarkMode }) => (
  <button
    onClick={onClick}
    style={{
      padding: '16px',
      background: isSelected ? `${color}15` : (isDarkMode ? '#27272a' : '#fff'),
      border: isSelected ? `2px solid ${color}` : (isDarkMode ? '2px solid transparent' : '1px solid var(--color-border)'),
      borderRadius: '16px',
      color: isDarkMode ? '#FFF' : 'var(--color-text-primary)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      position: 'relative'
    }}
  >
    {isSelected && (
      <motion.div
        layoutId="selected-check"
        style={{ position: 'absolute', top: '8px', right: '8px', color: color }}
      >
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
      </motion.div>
    )}
    <div style={{ fontSize: '24px' }}>{icon}</div>
    <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? color : '#d4d4d8' }}>{label}</div>
  </button>
);

const PaymentModal = ({ isOpen, onClose, totalAmount, currency, exchangeRates, onConfirm }) => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([{ id: Date.now(), amount: '', currency: currency, method: 'Cash' }]);
  const [changeCurrency, setChangeCurrency] = useState(currency);
  const [manualChange, setManualChange] = useState(0);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPayments([{ id: Date.now(), amount: '', currency: currency, method: 'Cash' }]);
      setChangeCurrency(currency);
    }
  }, [isOpen, currency]);

  // Calculations using passed-in exchange rates
  const totalPaidUSD = payments.reduce((acc, p) => acc + convertCurrency(Number(p.amount) || 0, p.currency, 'USD', exchangeRates), 0);
  const totalDueUSD = convertCurrency(totalAmount, currency, 'USD', exchangeRates);
  const remainingUSD = totalDueUSD - totalPaidUSD;
  const changeUSD = remainingUSD < 0 ? Math.abs(remainingUSD) : 0;
  const changeDisplayAmount = convertCurrency(changeUSD, 'USD', changeCurrency, exchangeRates);

  // Sync suggested change to manual change whenever payment/currency changes
  useEffect(() => {
    setManualChange(Math.round(changeDisplayAmount));
  }, [changeDisplayAmount]);

  const handleAddPayment = () => {
    setPayments([...payments, { id: Date.now(), amount: '', currency: currency, method: 'Cash' }]);
  };

  const handleRemovePayment = (id) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const handlePaymentChange = (id, field, value) => {
    setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleConfirm = () => {
    // Only confirm if fully paid
    if (remainingUSD > 0.01) return; // Allow tiny rounding errors
    onConfirm({ payments, change: { amount: Number(manualChange), currency: changeCurrency } });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="card"
          style={{ width: '500px', maxWidth: '90%', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
        >
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-app)' }}>
            <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '18px', fontWeight: 700 }}>{t('shop.pos.paymentDetails', 'Payment Details')}</h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}><X size={20}/></button>
          </div>

          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>{t('shop.pos.totalDue', 'Total Due')}</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-1px' }}>
                 {currency === 'USD' ? '$' : ''}{totalAmount.toLocaleString()} {currency}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('shop.pos.paymentsReceived', 'Payments Received')}</label>
                  <button onClick={handleAddPayment} style={{ fontSize: '12px', color: '#007AFF', background: 'rgba(0,122,255,0.1)', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, transition: 'all 0.2s' }}>
                    <Plus size={14}/> {t('common.add')}
                  </button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {payments.map((p, idx) => (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     key={p.id} 
                     style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                   >
                     <select 
                       value={p.method}
                       onChange={e => handlePaymentChange(p.id, 'method', e.target.value)}
                       style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                     >
                       <option value="Cash">{t('shop.payment.cash')}</option>
                       <option value="Mastercard">Mastercard</option>
                       <option value="Visa">Visa</option>
                       <option value="FIB">FIB</option>
                       <option value="FastPay">FastPay</option>
                     </select>
                     <input 
                       className="input-field" 
                       type="number" 
                       placeholder="0.00"
                       value={p.amount}
                       onChange={e => handlePaymentChange(p.id, 'amount', e.target.value)}
                       style={{ flex: 1, margin: 0, padding: '12px', borderRadius: '12px', background: 'var(--color-bg-app)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                     />
                     <select 
                       value={p.currency}
                       onChange={e => handlePaymentChange(p.id, 'currency', e.target.value)}
                       style={{ width: '85px', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-app)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none' }}
                     >
                       <option value="USD">USD</option>
                       <option value="IQD">IQD</option>
                       <option value="EUR">EUR</option>
                     </select>
                     {payments.length > 1 && (
                       <button onClick={() => handleRemovePayment(p.id)} style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,69,58,0.1)', color: '#FF453A', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                         <Trash2 size={16}/>
                       </button>
                     )}
                   </motion.div>
                 ))}
               </div>
            </div>

            {/* Change Section */}
            <div style={{ 
              marginTop: '32px', padding: '24px', 
              background: remainingUSD > 0.01 ? 'rgba(255, 149, 0, 0.08)' : 'rgba(52, 199, 89, 0.08)', 
              borderRadius: '20px', 
              border: `1px solid ${remainingUSD > 0.01 ? 'rgba(255, 149, 0, 0.2)' : 'rgba(52, 199, 89, 0.2)'}`,
              transition: 'all 0.3s ease'
            }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <div style={{ fontSize: '11px', fontWeight: 800, color: remainingUSD > 0.01 ? '#FF9500' : '#34C759', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                     {remainingUSD > 0.01 ? t('shop.pos.remainingDue', 'Still Due') : t('shop.pos.changeDue', 'Change Due')}
                   </div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: remainingUSD > 0.01 ? '#FF9500' : '#34C759', display: 'flex', alignItems: 'center', gap: '10px' }}>
                       {remainingUSD > 0.01 
                         ? `$${remainingUSD.toFixed(2)}` 
                         : <>
                             {changeCurrency === 'USD' && <span style={{ opacity: 0.6 }}>$</span>}
                             <input 
                               type="number"
                               value={manualChange}
                               onChange={e => setManualChange(e.target.value)}
                               style={{ 
                                 background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                 borderRadius: '12px', padding: '8px 16px',
                                 fontSize: '28px', fontWeight: 900, color: '#34C759', width: '180px', outline: 'none',
                                 textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                               }}
                             />
                             <span style={{ fontSize: '16px', opacity: 0.8 }}>{changeCurrency}</span>
                           </>
                       }
                    </div>
                 </div>

                 {remainingUSD <= 0.01 && (
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                     <label style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{t('shop.pos.changeCurrency', 'Currency')}</label>
                     <select 
                       value={changeCurrency} 
                       onChange={e => setChangeCurrency(e.target.value)}
                       style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '13px', outline: 'none' }}
                     >
                        <option value="USD">USD</option>
                        <option value="IQD">IQD</option>
                        <option value="EUR">EUR</option>
                     </select>
                   </div>
                 )}
               </div>
            </div>

          </div>

          <div style={{ padding: '24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-app)' }}>
            <button 
              onClick={handleConfirm}
              disabled={remainingUSD > 0.01}
              style={{ 
                width: '100%', padding: '18px', borderRadius: '16px', 
                background: remainingUSD > 0.01 ? 'var(--color-bg-card)' : 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)', 
                color: remainingUSD > 0.01 ? 'var(--color-text-secondary)' : '#FFF', 
                fontWeight: 800, border: 'none', cursor: remainingUSD > 0.01 ? 'not-allowed' : 'pointer',
                fontSize: '16px', letterSpacing: '0.5px', transition: 'all 0.2s',
                boxShadow: remainingUSD > 0.01 ? 'none' : '0 8px 25px -8px rgba(0, 122, 255, 0.5)',
                opacity: remainingUSD > 0.01 ? 0.5 : 1
              }}
            >
              {t('shop.pos.confirmPayment', 'Confirm Payment')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper for currency conversion using dynamic rates
const convertCurrency = (amount, from, to, rates) => {
  if (!rates) return amount;
  if (from === to) return amount;
  
  const amountInUSD = amount / rates[from];
  return amountInUSD * rates[to];
};

export default ShopDashboard;
