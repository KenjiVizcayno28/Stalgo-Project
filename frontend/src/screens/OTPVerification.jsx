import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthPages.css';

const OTPVerification = ({ userId }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/verify-otp/', {
        user_id: userId,
        otp_token: otp
      });

      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className='auth-container d-flex justify-content-center align-items-center'>
      <Card className='auth-card p-4'>
        <Card.Body className='text-center'>
          <h2 className='mb-4'>
            <i className='fas fa-shield-alt me-2'></i>Enter Authentication Code
          </h2>
          
          <p className='text-muted mb-4'>
            Enter the 6-digit code from your Google Authenticator app
          </p>

          {error && (
            <Alert variant='danger' dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleVerifyOTP}>
            <Form.Group className='mb-4'>
              <Form.Control
                type='text'
                placeholder='000000'
                maxLength='6'
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className='text-center'
                style={{ fontSize: '24px', letterSpacing: '8px' }}
                disabled={loading}
              />
            </Form.Group>

            <Button
              variant='primary'
              type='submit'
              className='w-100 py-2 fw-bold'
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default OTPVerification;
