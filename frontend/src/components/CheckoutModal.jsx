import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import './CheckoutModal.css';

function getPayPalClientId() {
  const raw = process.env.REACT_APP_PAYPAL_CLIENT_ID;
  if (!raw) return '';

  return raw.trim().replace(/^['"]|['"]$/g, '');
}

const PAYPAL_CLIENT_ID = getPayPalClientId();
let paypalSdkPromise = null;

function loadPayPalSdk() {
  if (!PAYPAL_CLIENT_ID) {
    return Promise.reject(
      new Error('PayPal client ID is missing. Set REACT_APP_PAYPAL_CLIENT_ID in frontend/.env and restart npm start.')
    );
  }

  if (window.paypal) {
    return Promise.resolve(window.paypal);
  }

  if (!paypalSdkPromise) {
    paypalSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
      script.async = true;
      script.onload = () => resolve(window.paypal);
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.body.appendChild(script);
    });
  }

  return paypalSdkPromise;
}

const CheckoutModal = ({ show, onHide, product, chosenProduct, userId, saleItem }) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const paypalRef = useRef(null);
  const paypalRenderedRef = useRef(false);
  const paypalButtonsRef = useRef(null);
  const isMountedRef = useRef(true);

  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  const isSaleCheckout = Boolean(saleItem);

  const parsedUser = useMemo(() => {
    try {
      return user ? JSON.parse(user) : null;
    } catch (err) {
      return null;
    }
  }, [user]);

  const itemName = isSaleCheckout
    ? (saleItem?.item || saleItem?.name || 'Sale Item')
    : (chosenProduct?.name || product?.name || 'Item');

  const itemUnit = isSaleCheckout
    ? 'promo'
    : (chosenProduct?.unit || product?.unit || 'unit');

  const basePrice = Number(isSaleCheckout ? saleItem?.price : chosenProduct?.price || 0);
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const totalAmount = (basePrice * safeQuantity).toFixed(2);
  const canCheckout = token && basePrice > 0 && (!isSaleCheckout ? chosenProduct : saleItem);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      try {
        if (paypalButtonsRef.current?.close) {
          paypalButtonsRef.current.close();
        }
      } catch (err) {
        // Ignore teardown errors from PayPal internals
      }
      paypalButtonsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!show) {
      setSdkReady(false);
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setIsProcessing(false);
    setQuantity(1);
    paypalRenderedRef.current = false;

    if (token) {
      loadPayPalSdk()
        .then(() => {
          if (isMountedRef.current) {
            setSdkReady(true);
          }
        })
        .catch((err) => {
          if (isMountedRef.current) {
            setErrorMessage(err.message || 'Could not load PayPal. Please try again.');
            setSdkReady(false);
          }
        });
    }
  }, [show, token]);

  useEffect(() => {
    let cancelled = false;
    const paypalContainer = paypalRef.current;

    if (!show || !sdkReady || !canCheckout || !paypalContainer || !window.paypal) {
      return;
    }

    try {
      if (paypalButtonsRef.current?.close) {
        paypalButtonsRef.current.close();
      }
    } catch (err) {
      // Ignore teardown errors from PayPal internals
    }
    paypalButtonsRef.current = null;
    paypalRenderedRef.current = false;
    if (paypalContainer) {
      paypalContainer.innerHTML = '';
    }

    if (!paypalContainer.isConnected) {
      return;
    }

    const buttons = window.paypal.Buttons({
        style: {
          shape: 'rect',
          layout: 'vertical',
          color: 'gold',
          label: 'paypal'
        },
        createOrder: (data, actions) => {
          return actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [
              {
                description: itemName,
                amount: {
                  currency_code: 'USD',
                  value: totalAmount
                }
              }
            ]
          });
        },
        onApprove: async (data, actions) => {
          try {
            if (!isMountedRef.current || cancelled) return;
            setIsProcessing(true);
            setStatusMessage('Finalizing your order...');
            setErrorMessage('');

            const details = await actions.order.capture();
            const payload = {
              product_name: itemName,
              product_id: isSaleCheckout
                ? saleItem?.id
                : (chosenProduct?._id || chosenProduct?.id || product?._id || product?.id || null),
              game: isSaleCheckout ? (saleItem?.game || 'General') : (product?.name || 'General'),
              type: isSaleCheckout ? 'sale' : (chosenProduct?.type || 'coin'),
              coins: !isSaleCheckout ? (chosenProduct?.amount || null) : null,
              quantity: safeQuantity,
              unit: itemUnit,
              price: Number(totalAmount),
              user_id_input: userId || '',
              payment_method: 'paypal',
              notes: `PayPal Order ${details?.id || ''} by ${parsedUser?.username || 'user'}`
            };

            const submitPurchase = () => fetch('/api/purchases/create/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`
              },
              body: JSON.stringify(payload)
            });

            let res;
            try {
              res = await submitPurchase();
            } catch (networkErr) {
              // On network timeout, retry once after 3.5 seconds
              console.warn('Purchase request timed out, retrying...', networkErr);
              await new Promise(resolve => setTimeout(resolve, 3500));
              res = await submitPurchase();
            }

            const savedPurchase = await res.json();
            if (!res.ok) {
              console.error('Purchase API error response:', savedPurchase);
              throw new Error(savedPurchase?.error || JSON.stringify(savedPurchase) || 'Failed to save purchase after PayPal payment');
            }

            try {
              const existing = JSON.parse(localStorage.getItem('inventory') || '[]');
              existing.unshift({
                id: savedPurchase.transaction_id || savedPurchase.id,
                name: savedPurchase.product_name,
                game: savedPurchase.game || 'General',
                type: savedPurchase.type || payload.type,
                coins: savedPurchase.coins,
                quantity: savedPurchase.quantity,
                price: savedPurchase.price,
                status: savedPurchase.status,
                date: savedPurchase.created_at || new Date().toISOString(),
                payment_method: 'paypal'
              });
              localStorage.setItem('inventory', JSON.stringify(existing));
              window.dispatchEvent(new Event('storage'));
            } catch (err) {
              console.error('Failed to update local inventory after checkout', err);
            }

            if (!isMountedRef.current || cancelled) return;
            setStatusMessage('Payment complete. Your purchase has been added to your transactions.');
            setTimeout(() => {
              if (!isMountedRef.current || cancelled) return;
              onHide();
              navigate('/profile/transactions');
            }, 1000);
          } catch (err) {
            if (!isMountedRef.current || cancelled) return;
            const errMsg = err.message || 'Payment succeeded but purchase processing failed.';
            // Show network timeouts vs API errors differently
            const displayMsg = errMsg.includes('timeout') || errMsg.includes('Failed to fetch')
              ? 'Order processing timed out. Please wait 30-60 seconds and check your transactions, or try again.'
              : errMsg;
            console.error('Checkout error:', err);
            setErrorMessage(displayMsg);
          } finally {
            if (!isMountedRef.current || cancelled) return;
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          if (!isMountedRef.current || cancelled) return;
          setStatusMessage('Payment was cancelled. You can try again anytime.');
        },
        onError: (err) => {
          if (!isMountedRef.current || cancelled) return;
          setErrorMessage(err?.message || 'PayPal checkout failed. Please try again.');
        }
      });

    paypalButtonsRef.current = buttons;
    buttons
      .render(paypalContainer)
      .then(() => {
        if (!isMountedRef.current || cancelled) return;
        paypalRenderedRef.current = true;
      })
      .catch((err) => {
        if (!isMountedRef.current || cancelled) return;
        setErrorMessage(err.message || 'Failed to render PayPal buttons.');
      });

    return () => {
      cancelled = true;
      try {
        if (paypalButtonsRef.current?.close) {
          paypalButtonsRef.current.close();
        }
      } catch (err) {
        // Ignore teardown errors from PayPal internals
      }
      paypalButtonsRef.current = null;
      if (paypalContainer) {
        paypalContainer.innerHTML = '';
      }
    };
  }, [show, sdkReady, canCheckout, itemName, totalAmount, safeQuantity, isSaleCheckout, saleItem, chosenProduct, product, itemUnit, userId, parsedUser, token, onHide, navigate]);

  const handleLoginClick = () => {
    if (!token || !user) {
      onHide();
      navigate('/login');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="checkout-modal">
      <Modal.Header closeButton className="checkout-header">
        <Modal.Title className="checkout-title">{itemName} - PayPal Checkout</Modal.Title>
      </Modal.Header>
      <Modal.Body className="checkout-body">
        {!isSaleCheckout && (
          <p className="product-description">User ID: <strong>{userId || 'Not provided'}</strong></p>
        )}
        
        <div className="price-section">
          <div className="price-row">
            <span className="price-label">Item:</span>
            <span className="price-value">{itemName}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Price per unit:</span>
            <span className="price-value">${basePrice.toFixed(2)}</span>
          </div>
        </div>

        {!isSaleCheckout && (
          <div className="quantity-section">
            <label className="quantity-label">Quantity:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              className="quantity-input"
            />
          </div>
        )}

        <div className="total-section">
          <span className="total-label">Total:</span>
          <span className="total-value">${totalAmount}</span>
        </div>

        {errorMessage && <div className="checkout-alert checkout-error">{errorMessage}</div>}
        {statusMessage && <div className="checkout-alert checkout-status">{statusMessage}</div>}

        {token && canCheckout && (
          <div className="paypal-area">
            <div className="paypal-badge">Pay securely with PayPal</div>
            <div ref={paypalRef} className="paypal-button-container" />
          </div>
        )}

        {token && !canCheckout && (
          <div className="checkout-alert checkout-error">Please select a valid item before checkout.</div>
        )}

        {token && !sdkReady && !errorMessage && (
          <div className="checkout-alert checkout-status">Loading PayPal...</div>
        )}
      </Modal.Body>
      <Modal.Footer className="checkout-footer">
        <Button variant="secondary" onClick={onHide} className="cancel-btn">
          Cancel
        </Button>
        {!token ? (
          <Button variant="danger" onClick={handleLoginClick} className="login-btn">
            Login to Purchase
          </Button>
        ) : (
          <Button variant="primary" disabled className="purchase-btn">
            {isProcessing ? 'Processing...' : 'Use PayPal Button Above'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CheckoutModal;
