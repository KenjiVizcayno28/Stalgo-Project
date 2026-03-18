import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import './TwoFactorSetup.css';

const TwoFactorSetup = ({ show, onHide, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Initial, 2: QR Code, 3: Verify
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleGenerateQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      
      const makeRequest = () => axios.get('/api/2fa/enable/', {
        headers: {
          Authorization: `Token ${token}`
        }
      });

      let response;
      try {
        response = await makeRequest();
      } catch (networkErr) {
        // On network timeout, retry once after 3.5 seconds
        if (!networkErr.response) {
          console.warn('2FA request timed out, retrying...', networkErr);
          await new Promise(resolve => setTimeout(resolve, 3500));
          response = await makeRequest();
        } else {
          throw networkErr;
        }
      }
      
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
      setStep(2);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to generate QR code';
      setError(errMsg);
      console.error('2FA enable error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
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
      
      setSuccess(true);
      setStep(3);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setQrCode(null);
    setSecret(null);
    setOtp('');
    setError(null);
    setSuccess(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className='fas fa-shield-alt me-2'></i>Enable Two-Factor Authentication
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {step === 1 && (
          <div className='text-center'>
            <p className='mb-4'>Secure your account with Two-Factor Authentication using Google Authenticator.</p>
            <div className='mb-4'>
              <i className='fas fa-mobile-alt fa-3x text-primary'></i>
            </div>
            <p className='text-muted'>You'll need to:</p>
            <ol className='text-start'>
              <li>Scan the QR code with Google Authenticator app</li>
              <li>Enter the 6-digit code to verify</li>
              <li>Your account will be protected</li>
            </ol>
          </div>
        )}

        {step === 2 && (
          <div className='text-center'>
            <p className='mb-4'>Scan this QR code with Google Authenticator:</p>
            {qrCode && (
              <div className='mb-4'>
                <img src={qrCode} alt='2FA QR Code' className='qr-code' />
              </div>
            )}
            <div className='alert alert-info' role='alert'>
              <strong>Can't scan?</strong> Enter this key manually:
              <div className='font-monospace mt-2 p-2 bg-light rounded'>
                {secret}
              </div>
            </div>
            <p className='text-muted mb-4'>Enter the 6-digit code from your authenticator app:</p>
            <Form.Control
              type='text'
              placeholder='000000'
              maxLength='6'
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className='text-center font-monospace'
              style={{ fontSize: '24px', letterSpacing: '8px' }}
              disabled={loading}
            />
          </div>
        )}

        {step === 3 && success && (
          <div className='text-center'>
            <div className='mb-4'>
              <i className='fas fa-check-circle fa-3x text-success'></i>
            </div>
            <h5>Two-Factor Authentication Enabled!</h5>
            <p className='text-muted'>Your account is now protected. You'll need to enter a code from your authenticator app when logging in.</p>
          </div>
        )}

        {error && (
          <Alert variant='danger' dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant='secondary' onClick={handleClose}>
          Cancel
        </Button>
        {step === 1 && (
          <Button variant='primary' onClick={handleGenerateQR} disabled={loading}>
            {loading ? <Spinner animation='border' size='sm' className='me-2' /> : null}
            Get Started
          </Button>
        )}
        {step === 2 && (
          <Button 
            variant='primary' 
            onClick={handleVerifyOTP} 
            disabled={loading || otp.length !== 6}
          >
            {loading ? <Spinner animation='border' size='sm' className='me-2' /> : null}
            Verify & Enable
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default TwoFactorSetup;
