import { useState, useEffect, useRef } from 'react';
import { Calculator, X, Search, QrCode, CreditCard, Banknote, ShoppingBag, Delete, Check, Minus, Plus, Trash2, User, Percent } from 'lucide-react';
import { useNotification } from '../../../components/ui/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { inventoryService } from '../../warehouse/inventory/inventoryService';
import { salesService } from '../services/salesService';
import { ReceiptTemplate } from './ReceiptTemplate';
import { notificationService } from '../../common/services/notificationService'; // Ensure this path is correct relative to ShopDashboard

import { useAuth } from '../../../features/auth/AuthContext';

const ShopDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
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


  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
    return () => window.removeEventListener('click', handleClickAnywhere);
  }, []);

  // --- HANDLERS ---
  const handleScan = async (e) => {
    e.preventDefault();
    const barcode = scanInput;
    if (!barcode) return;

    setScanning(true);
    setScanInput(''); // Clear immediately for UX

    try {
      const product = await inventoryService.getProductByBarcode(barcode);

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
          priceIQD: Number(product.priceIQD || 0),
          priceEUR: Number(product.priceEUR || 0)
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

  const handleCompleteSale = async (status = 'COMPLETED') => {
    if (cart.length === 0 || (!selectedMethod && status === 'COMPLETED')) return;

    setProcessing(true);
    try {
      // 1. Deduct Stock
      await inventoryService.processSale(cart);

      // 2. Record Sale
      await salesService.createSale({
        items: cart,
        items: cart,
        total: currency === 'IQD' ? totals.iqd : (currency === 'EUR' ? totals.eur : grandTotalUSD),
        currency: currency, // Use selected currency
        clientName: clientName || '', // Add optional client name
        additionalDiscount: Number(additionalDiscount) || 0, // Record the discount %
        paymentMethod: status === 'ORDER' ? 'Pay Later' : selectedMethod.name,
        paymentMethodId: status === 'ORDER' ? 'order' : selectedMethod.id,
        status: status, // 'COMPLETED' or 'ORDER'
        branchId: currentBranchId,
        adminId: user?.id || 'staff',
        adminName: user?.name || user?.username || 'Staff',
      });

      const successMsg = status === 'ORDER' ? t('shop.pos.orderSaved') : t('shop.pos.saleCompleted');
      console.log(`${successMsg} Total: ${grandTotalUSD}`);
      playSound('success');

      // Reset UI
      setCart([]);
      setLastScanned(null);
      setClientName('');
      setAdditionalDiscount('');

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
  // Calculates totals for ALL currencies simultaneously
  const rawTotals = cart.reduce((acc, item) => {
    const discount = (Number(item.discount) || 0) / 100;

    const priceUSD = Number(item.sellPrice || item.price || 0); // sellPrice is USD base
    const priceIQD = Number(item.priceIQD || 0);
    const priceEUR = Number(item.priceEUR || 0);

    acc.usd += (priceUSD * (1 - discount)) * item.qty;
    acc.iqd += (priceIQD * (1 - discount)) * item.qty;
    acc.eur += (priceEUR * (1 - discount)) * item.qty;

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
    <div className="layout-container" style={{ height: '100vh', display: 'grid', gridTemplateColumns: '1fr 400px', background: 'var(--color-bg-app)', overflow: 'hidden' }}>

      {/* LEFT COLUMN: ACTIVE CART (65%) */}
      <div style={{ flex: '65%', padding: '24px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--color-border)' }}>

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
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', fontSize: '16px',
                outline: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <div style={{ position: 'absolute', right: '12px', top: '14px', color: '#555', fontSize: '11px', fontWeight: 600, background: '#111', padding: '2px 8px', borderRadius: '4px' }}>
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
                  <div style={{ fontSize: '14px', opacity: 0.7, textDecoration: 'line-through' }}>${lastScanned.price}</div>
                )}
                <div style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' }}>
                  {formatUSD(lastScanned.price * (1 - (lastScanned.discount || 0) / 100))}
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
                  padding: '16px 20px', marginBottom: '12px', background: 'var(--color-bg-card)', borderRadius: '16px',
                  border: '1px solid var(--color-border)'
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
                          <span style={{ textDecoration: 'line-through', marginRight: '6px' }}>${item.price}</span>
                          <span style={{ color: '#34C759', fontWeight: 'bold' }}>${(item.price * (1 - item.discount / 100)).toFixed(2)}</span>
                        </span>
                      ) : (
                        ` $${item.price}`
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
                    ${((item.price * (1 - (item.discount || 0) / 100)) * item.qty).toFixed(2)}
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

          {cart.length === 0 && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
              <div style={{ padding: '24px', background: '#18181b', borderRadius: '50%', marginBottom: '24px', border: '1px solid #27272a' }}>
                <ShoppingBag size={48} opacity={0.5} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{t('shop.pos.registerReady')}</div>
              <div style={{ fontSize: '14px' }}>{t('shop.pos.scanToStart')}</div>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: CONTROLS & TOTALS (35%) */}
      <div style={{ flex: '35%', background: 'var(--color-bg-card)', padding: '32px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--color-border)' }}>

        {/* Customer Details Summary Card */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, letterSpacing: '1px' }}>
              {t('shop.receipt.clientLabel')} & {t('shop.receipt.discountLabel')}
            </h3>
            <button
              onClick={() => setIsDetailsModalOpen(true)}
              style={{
                background: '#007AFF15', border: '1px solid #007AFF30',
                color: '#007AFF', padding: '4px 12px', borderRadius: '12px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              {clientName || additionalDiscount ? t('common.edit') : t('common.add')}
            </button>
          </div>

          <div style={{
            background: 'var(--color-bg-app)', borderRadius: '16px', padding: '16px',
            border: '1px solid var(--color-border)', display: 'flex', gap: '16px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{t('shop.receipt.clientLabel')}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: clientName ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                {clientName || t('common.none')}
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--color-border)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{t('shop.receipt.discountLabel')}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: Number(additionalDiscount) > 0 ? '#34C759' : 'var(--color-text-secondary)' }}>
                {additionalDiscount ? `${additionalDiscount}%` : '0%'}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ marginBottom: 'auto' }}>
          <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, letterSpacing: '1px', marginBottom: '20px' }}>{t('shop.pos.selectPaymentMethod')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {paymentMethods.map(method => (
              <PaymentButton
                key={method.id}
                label={method.name}
                icon={method.icon}
                color={method.currency === 'USD' ? '#34C759' : '#007AFF'}
                isSelected={selectedMethod?.id === method.id}
                onClick={() => setSelectedMethod(method)}
              />
            ))}
          </div>
        </div>

        {/* Totals Section */}
        <div style={{ marginTop: '32px', background: '#09090b', borderRadius: '24px', padding: '24px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#a1a1aa', fontSize: '14px' }}>
            <span>{t('shop.pos.subtotal', { currency: 'USD' })}</span>
            <span>{formatUSD(totals.usd)}</span>
          </div>

          <div style={{ height: '1px', background: '#27272a', marginBottom: '24px' }} />

          {/* CURRENCY SELECTION BUTTONS */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
            {/* IQD Button (Default) */}
            <button
              onClick={() => setCurrency('IQD')}
              style={{
                flex: 1, padding: '12px', borderRadius: '16px',
                background: currency === 'IQD' ? 'rgba(0, 122, 255, 0.2)' : 'var(--color-bg-app)',
                border: currency === 'IQD' ? '2px solid #007AFF' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>IQD</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: currency === 'IQD' ? '#007AFF' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{formatIQD(totals.iqd)}</div>
            </button>

            {/* USD Button */}
            <button
              onClick={() => setCurrency('USD')}
              style={{
                flex: 1, padding: '12px', borderRadius: '16px',
                background: currency === 'USD' ? 'rgba(52, 199, 89, 0.2)' : 'var(--color-bg-app)',
                border: currency === 'USD' ? '2px solid #34C759' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>USD</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: currency === 'USD' ? '#34C759' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{formatUSD(grandTotalUSD)}</div>
            </button>

            {/* EUR Button */}
            <button
              onClick={() => setCurrency('EUR')}
              style={{
                flex: 1, padding: '12px', borderRadius: '16px',
                background: currency === 'EUR' ? 'rgba(255, 149, 0, 0.2)' : 'var(--color-bg-app)',
                border: currency === 'EUR' ? '2px solid #FF9500' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 600 }}>EUR</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: currency === 'EUR' ? '#FF9500' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{formatEUR(totals.eur)}</div>
            </button>
          </div>

          <button
            onClick={() => handleCompleteSale('COMPLETED')}
            disabled={cart.length === 0 || processing}
            style={{
              width: '100%', padding: '24px', borderRadius: '16px', border: 'none',
              background: cart.length > 0 ? 'linear-gradient(135deg, #007AFF 0%, #0066CC 100%)' : '#27272a',
              color: cart.length > 0 ? '#FFF' : '#71717a',
              fontSize: '18px', fontWeight: '700',
              cursor: cart.length > 0 && !processing ? 'pointer' : 'not-allowed',
              opacity: cart.length > 0 && !processing ? 1 : 0.8,
              transition: 'all 0.2s',
              boxShadow: cart.length > 0 ? '0 10px 30px -10px rgba(0,122,255,0.5)' : 'none',
              transform: cart.length > 0 ? 'translateY(0)' : 'none'
            }}
          >
            {processing ? t('shop.pos.processing') : (cart.length > 0 ? t('shop.pos.chargeAmount', {
              total: currency === 'IQD' ? formatIQD(totals.iqd) : (currency === 'EUR' ? formatEUR(totals.eur) : formatUSD(grandTotalUSD))
            }) : t('shop.pos.cartEmpty'))}
          </button>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={() => handleCompleteSale('ORDER')}
              disabled={cart.length === 0 || processing}
              style={{ flex: 1, padding: '16px', background: '#27272a', border: '1px solid #3f3f46', borderRadius: '12px', color: '#d4d4d8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('shop.pos.saveAsOrder')}
            </button>
            <button
              onClick={() => { setCart([]); }}
              style={{ flex: 1, padding: '16px', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: '12px', color: '#FF453A', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
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
            background: '#27272a', border: '1px solid #3f3f46', borderRadius: '50px',
            padding: '12px 24px', color: '#a1a1aa', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
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
const PaymentButton = ({ label, icon, color, isSelected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '24px',
      background: isSelected ? `${color}15` : '#27272a',
      border: isSelected ? `2px solid ${color}` : '2px solid transparent',
      borderRadius: '16px',
      color: '#FFF',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      position: 'relative'
    }}
  >
    {isSelected && (
      <motion.div
        layoutId="selected-check"
        style={{ position: 'absolute', top: '10px', right: '10px', color: color }}
      >
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
      </motion.div>
    )}
    <div style={{ fontSize: '28px' }}>{icon}</div>
    <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? color : '#d4d4d8' }}>{label}</div>
  </button>
);

export default ShopDashboard;


