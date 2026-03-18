import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import OTPVerification from './OTPVerification';
import './AuthPages.css';

const LoginScreen = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [requireOtp, setRequireOtp] = useState(false);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/login/', {
        username: formData.username,
        password: formData.password,
      });

      // Check if OTP is required
      if (response.data.require_otp) {
        setUserId(response.data.user_id);
        setRequireOtp(true);
      } else {
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        setAlert({
          type: 'success',
          message: response.data.message || 'Login successful!',
        });

        // Redirect to home after 1.5 seconds
        setTimeout(() => {
          navigate('/');
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        'Login failed. Please check your credentials.';
      setAlert({
        type: 'danger',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Show OTP verification screen if required
  if (requireOtp) {
    return <OTPVerification userId={userId} />;
  }

  return (
    <Container fluid className="auth-container d-flex justify-content-center align-items-center">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={10} md={6} lg={5}>
          <Card className="auth-card shadow-lg">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4 fw-bold text-primary">
                Welcome Back
              </h2>

              {alert && (
                <Alert
                  variant={alert.type}
                  onClose={() => setAlert(null)}
                  dismissible
                >
                  {alert.message}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    isInvalid={!!errors.username}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    isInvalid={!!errors.password}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 fw-semibold py-2 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>

              <div className="text-center">
                <p className="text-muted mb-0">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-primary fw-semibold">
                    Sign up here
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginScreen;
