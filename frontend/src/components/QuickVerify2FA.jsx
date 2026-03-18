import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';

const QuickVerify2FA = ({ show, onHide, onSuccess, onError }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        '/api/2fa/confirm/',
        { otp_token: otp },
        {
          headers: {
            Authorization: `Token ${token}`
          }
        }
      );
      
      setOtp('');
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1000);
    } catch (err) {
      console.error('2FA verification error:', err);
      setError(err.response?.data?.error || 'Invalid OTP code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOtp('');
    setError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className='fas fa-shield-alt me-2'></i>Verify Your Authenticator
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className='text-center mb-4'>
          Enter the 6-digit code from your Google Authenticator app to enable 2FA
        </p>

        {error && (
          <Alert variant='danger' dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleVerifyOTP}>
          <Form.Group className='mb-3'>
            <Form.Control
              type='text'
              placeholder='000000'
              maxLength='6'
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className='text-center'
              style={{ fontSize: '24px', letterSpacing: '8px' }}
              disabled={loading}
              autoFocus
            />
          </Form.Group>

          <Button
            variant='primary'
            type='submit'
            className='w-100 py-2 fw-bold'
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <Spinner animation='border' size='sm' className='me-2' />
                Verifying...
              </>
            ) : (
              'Enable & Confirm'
            )}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default QuickVerify2FA;
