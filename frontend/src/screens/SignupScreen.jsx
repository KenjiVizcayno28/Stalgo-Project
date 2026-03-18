import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import './AuthPages.css';

const SignupScreen = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
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
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const submitRegistration = () => axios.post('/api/register/', {
    username: formData.username,
    email: formData.email,
    first_name: formData.first_name,
    last_name: formData.last_name,
    password: formData.password,
    password2: formData.password2,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      let response;
      try {
        response = await submitRegistration();
      } catch (firstError) {
        // Render free tier can sleep; retry once after a short delay.
        if (!firstError.response) {
          await wait(3500);
          response = await submitRegistration();
        } else {
          throw firstError;
        }
      }

      // Store token in localStorage
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      setAlert({
        type: 'success',
        message: response.data.message || 'Account created successfully!',
      });

      // Redirect to home after 1.5 seconds
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 1500);
    } catch (error) {
      const errorData = error.response?.data;
      const newErrors = {};

      // log full error for debugging
      console.error('Signup error response:', error.response || error);

      if (errorData) {
        // If response is a dict of field errors from DRF, map them
        Object.keys(errorData).forEach((key) => {
          if (Array.isArray(errorData[key])) {
            newErrors[key] = errorData[key][0];
          } else if (typeof errorData[key] === 'object') {
            // nested errors
            newErrors[key] = JSON.stringify(errorData[key]);
          } else {
            newErrors[key] = errorData[key];
          }
        });
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // also show a top-level alert if there's a non-field message
        if (newErrors.detail || newErrors.non_field_errors) {
          setAlert({ type: 'danger', message: newErrors.detail || newErrors.non_field_errors });
        }
      } else if (!error.response) {
        setAlert({
          type: 'danger',
          message: 'Cannot reach server right now. If this is the first request, wait 20-60 seconds for Render to wake up, then try again.'
        });
      } else {
        // If backend didn't return structured errors, show raw message if available
        const rawMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
        setAlert({ type: 'danger', message: rawMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="auth-container d-flex justify-content-center align-items-center">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={10} md={7} lg={6}>
          <Card className="auth-card shadow-lg">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4 fw-bold text-primary">
                Create Account
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
                <Row className="g-2">
                  <Col xs={12} sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        First Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="First name (optional)"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Last name (optional)"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    isInvalid={!!errors.username}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    isInvalid={!!errors.email}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    isInvalid={!!errors.password}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    Confirm Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password2"
                    value={formData.password2}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    isInvalid={!!errors.password2}
                    disabled={loading}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password2}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 fw-semibold py-2 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </Form>

              <div className="text-center">
                <p className="text-muted mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary fw-semibold">
                    Login here
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

export default SignupScreen;
