import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import TwoFactorSetup from '../components/TwoFactorSetup';
import QuickVerify2FA from '../components/QuickVerify2FA';
import { useNavigate } from 'react-router-dom';

const SecurityScreen = () => {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [showTwoFaModal, setShowTwoFaModal] = useState(false);
  const [showQuickVerify, setShowQuickVerify] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableOtp, setDisableOtp] = useState('');
  const [disableError, setDisableError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchSecurityInfo();
  }, [navigate]);

  const fetchSecurityInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/profile/', {
        headers: {
          Authorization: `Token ${token}`
        }
      });
      
      setTwoFaEnabled(response.data.two_fa_enabled);
    } catch (error) {
      console.error('Error fetching security info:', error);
      setAlert({
        type: 'danger',
        message: 'Failed to load security settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
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
      
      // Check if we got a QR code (new setup) or just the URI (re-enabling)
      if (response.data.qr_code) {
        // Full setup with QR code
        setShowTwoFaModal(true);
      } else {
        // Re-enabling with existing secret - just verify the OTP
        setShowQuickVerify(true);
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      const errMsg = error.response?.data?.error || error.message || 'Failed to start 2FA setup. Please try again.';
      setAlert({
        type: 'danger',
        message: errMsg
      });
    }
  };

  const handleDisable2FA = async () => {
    // Show OTP confirmation dialog
    setShowDisableConfirm(true);
  };

  const handleConfirmDisable = async () => {
    if (!disableOtp || disableOtp.length !== 6) {
      setDisableError('Please enter a valid 6-digit code');
      return;
    }

    setDisabling(true);
    setDisableError(null);
    try {
      const token = localStorage.getItem('authToken');
      
      await axios.post(
        '/api/2fa/disable/',
        { otp_token: disableOtp },
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      setTwoFaEnabled(false);
      setShowDisableConfirm(false);
      setDisableOtp('');
      setAlert({
        type: 'success',
        message: '✓ Two-Factor Authentication has been disabled'
      });
    } catch (error) {
      console.error('Disable 2FA error - Full error:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      setDisableError(error.response?.data?.error || 'Failed to disable. Please try again.');
      setDisableOtp('');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <Container className='d-flex justify-content-center align-items-center' style={{ minHeight: '100vh' }}>
        <Spinner animation='border' />
      </Container>
    );
  }

  return (
    <Container className='py-5'>
      <Row className='mb-4'>
        <Col>
          <h1 className='mb-4'>
            <i className='fas fa-shield-alt me-2 text-primary'></i>Security Settings
          </h1>
        </Col>
      </Row>

      {alert && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card className='mb-4 shadow-sm'>
            <Card.Header className='bg-primary text-white'>
              <i className='fas fa-lock me-2'></i>Two-Factor Authentication (2FA)
            </Card.Header>
            <Card.Body>
              <ListGroup variant='flush'>
                <ListGroup.Item className='d-flex justify-content-between align-items-center'>
                  <div>
                    <h6 className='mb-2'>Google Authenticator</h6>
                    <p className='text-muted small mb-0'>
                      Add an extra layer of security to your account using Google Authenticator
                    </p>
                  </div>
                  <div className='ms-3 d-flex gap-2'>
                    {twoFaEnabled ? (
                      <>
                        <span className='badge bg-success align-self-center'>Enabled</span>
                        <Button 
                          variant='danger' 
                          size='sm'
                          onClick={handleDisable2FA}
                          disabled={disabling}
                        >
                          {disabling ? (
                            <>
                              <Spinner animation='border' size='sm' className='me-1' />
                              Disabling...
                            </>
                          ) : (
                            <>
                              <i className='fas fa-times me-1'></i>Disable
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className='badge bg-secondary align-self-center'>Disabled</span>
                        <Button 
                          variant='warning' 
                          size='sm'
                          onClick={handleEnable2FA}
                        >
                          <i className='fas fa-check me-1'></i>Enable
                        </Button>
                      </>
                    )}
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>

          <Card className='shadow-sm'>
            <Card.Header className='bg-info text-white'>
              <i className='fas fa-info-circle me-2'></i>What is 2FA?
            </Card.Header>
            <Card.Body>
              <p>
                Two-Factor Authentication (2FA) adds an extra layer of security to your account. 
                When 2FA is enabled, you'll need to enter a code from the Google Authenticator app 
                in addition to your password when logging in.
              </p>
              <h6 className='mt-4 mb-3'>How it works:</h6>
              <ol>
                <li>Download Google Authenticator on your phone</li>
                <li>Enable 2FA in your security settings</li>
                <li>Scan the QR code with the app</li>
                <li>When logging in, enter the 6-digit code from the app</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <TwoFactorSetup 
        show={showTwoFaModal}
        onHide={() => setShowTwoFaModal(false)}
        onSuccess={() => {
          setTwoFaEnabled(true);
          setAlert({
            type: 'success',
            message: '✓ You\'re all set! Two-Factor Authentication is now enabled on your account. You\'ll need to enter a code from your authenticator app when logging in.'
          });
        }}
      />

      <QuickVerify2FA 
        show={showQuickVerify}
        onHide={() => setShowQuickVerify(false)}
        onSuccess={() => {
          setTwoFaEnabled(true);
          setAlert({
            type: 'success',
            message: '✓ You\'re all set! Two-Factor Authentication is now enabled on your account. You\'ll need to enter a code from your authenticator app when logging in.'
          });
        }}
      />

      {/* Disable 2FA Confirmation Modal */}
      <Modal show={showDisableConfirm} onHide={() => setShowDisableConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className='fas fa-exclamation-triangle me-2 text-danger'></i>Confirm Disable 2FA
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className='mb-4'>
            To disable Two-Factor Authentication, please enter the 6-digit code from your authenticator app:
          </p>
          
          {disableError && (
            <Alert variant='danger' dismissible onClose={() => setDisableError(null)}>
              {disableError}
            </Alert>
          )}

          <Form.Group className='mb-3'>
            <Form.Control
              type='text'
              placeholder='000000'
              maxLength='6'
              value={disableOtp}
              onChange={(e) => setDisableOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className='text-center'
              style={{ fontSize: '24px', letterSpacing: '8px' }}
              disabled={disabling}
              autoFocus
            />
          </Form.Group>

          <p className='text-muted small'>
            This action is irreversible and your account will no longer have Two-Factor Authentication enabled.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowDisableConfirm(false)}>
            Cancel
          </Button>
          <Button 
            variant='danger' 
            onClick={handleConfirmDisable}
            disabled={disabling || disableOtp.length !== 6}
          >
            {disabling ? (
              <>
                <Spinner animation='border' size='sm' className='me-2' />
                Disabling...
              </>
            ) : (
              'Disable 2FA'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SecurityScreen;
