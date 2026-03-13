import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import './CheckoutModal.css';

const CheckoutModal = ({ show, onHide, product, chosenProduct, userId }) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);

  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');

  const handleCheckout = () => {
    if (!token || !user) {
      // Redirect to login page
      onHide();
      navigate('/login');
      return;
    }

    // Proceed with checkout: send purchase to backend
    const payload = {
      product_name: product?.name || chosenProduct?.name || 'Item',
      product_id: chosenProduct?._id || chosenProduct?.id || null,
      game: product?.name || 'General',
      type: chosenProduct?.type || 'coin',
      coins: chosenProduct?.amount || null,
      quantity: quantity,
      unit: chosenProduct?.unit || 'unit',
      price: chosenProduct?.price || 0,
      payment_method: 'card',
      notes: `Purchased from frontend by user ${JSON.parse(user).username || ''}`
    }

    fetch('http://127.0.0.1:8000/api/purchases/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error((data && data.error) || 'Failed to create purchase')

        // Add to local storage inventory for immediate UI compatibility
        try {
          const mapped = {
            id: data.transaction_id || data.id,
            name: data.product_name,
            game: data.game || product?.name || 'General',
            type: data.type || chosenProduct?.type || 'coin',
            coins: data.coins || chosenProduct?.amount || null,
            quantity: data.quantity,
            price: data.price,
            status: data.status,
            date: data.created_at || new Date().toISOString()
          }
          const existing = JSON.parse(localStorage.getItem('inventory') || '[]')
          existing.unshift(mapped)
          localStorage.setItem('inventory', JSON.stringify(existing))
          // Trigger storage event for other tabs/components
          window.dispatchEvent(new Event('storage'))
        } catch (e) {
          console.error('Failed updating local inventory', e)
        }

        alert('Purchase successful! Transaction ID: ' + (data.transaction_id || data.id))
        onHide()
        navigate('/profile/transactions')
      })
      .catch(err => {
        console.error(err)
        alert('Purchase failed: ' + err.message)
      })
  };

  const handleLoginClick = () => {
    onHide();
    navigate('/login');
  };

  const total = (chosenProduct?.price * quantity).toFixed(2);

  return (
    <Modal show={show} onHide={onHide} centered className="checkout-modal">
      <Modal.Header closeButton className="checkout-header">
        <Modal.Title className="checkout-title">{product?.name} - Checkout</Modal.Title>
      </Modal.Header>
      <Modal.Body className="checkout-body">
        <p className="product-description">User ID: <strong>{userId}</strong></p>
        
        <div className="price-section">
          <div className="price-row">
            <span className="price-label">Package:</span>
            <span className="price-value">{chosenProduct?.amount} {chosenProduct?.unit}</span>
          </div>
          <div className="price-row">
            <span className="price-label">Price per unit:</span>
            <span className="price-value">${chosenProduct?.price}</span>
          </div>
        </div>

        <div className="quantity-section">
          <label className="quantity-label">Quantity:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            className="quantity-input"
          />
        </div>

        <div className="total-section">
          <span className="total-label">Total:</span>
          <span className="total-value">${total}</span>
        </div>
      </Modal.Body>
      <Modal.Footer className="checkout-footer">
        <Button variant="secondary" onClick={onHide} className="cancel-btn">
          Cancel
        </Button>
        {token ? (
          <Button variant="primary" onClick={handleCheckout} className="purchase-btn">
            Buy Now
          </Button>
        ) : (
          <Button variant="danger" onClick={handleLoginClick} className="login-btn">
            Login to Purchase
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CheckoutModal;
