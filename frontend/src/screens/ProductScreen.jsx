import React, {useEffect, useState, useMemo} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Col, ListGroup, Row, Image, Card, Button, Form } from 'react-bootstrap';
// Rating removed per request
import CheckoutModal from '../components/CheckoutModal';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Define packages outside component to avoid recalculation
const PACKAGES_BY_UNIT = {
    diamonds: [
        { amount: 10, price: 1.99 },
        { amount: 30, price: 4.99 },
        { amount: 50, price: 7.99 },
        { amount: 100, price: 14.99 },
        { amount: 200, price: 29.99 },
        { amount: 500, price: 74.99 },
        { amount: 1000, price: 149.99 }
    ],
    shells: [
        { amount: 100, price: 1.99 },
        { amount: 300, price: 4.99 },
        { amount: 500, price: 7.99 },
        { amount: 1000, price: 14.99 },
        { amount: 2000, price: 29.99 },
        { amount: 5000, price: 74.99 },
        { amount: 10000, price: 149.99 }
    ],
    'wild cores': [
        { amount: 50, price: 1.99 },
        { amount: 150, price: 4.99 },
        { amount: 250, price: 7.99 },
        { amount: 500, price: 14.99 },
        { amount: 1000, price: 29.99 },
        { amount: 2500, price: 74.99 },
        { amount: 5000, price: 149.99 }
    ],
    robux: [
        { amount: 100, price: 4.99 },
        { amount: 400, price: 9.99 },
        { amount: 800, price: 19.99 },
        { amount: 1700, price: 39.99 },
        { amount: 3500, price: 79.99 },
        { amount: 7000, price: 149.99 },
        { amount: 15000, price: 299.99 }
    ],
    primogems: [
        { amount: 50, price: 1.99 },
        { amount: 150, price: 4.99 },
        { amount: 300, price: 9.99 },
        { amount: 600, price: 19.99 },
        { amount: 1200, price: 39.99 },
        { amount: 3000, price: 99.99 },
        { amount: 6000, price: 199.99 }
    ],
    'oneiric shards': [
        { amount: 50, price: 1.99 },
        { amount: 100, price: 3.99 },
        { amount: 200, price: 7.99 },
        { amount: 500, price: 19.99 },
        { amount: 1000, price: 39.99 },
        { amount: 2000, price: 79.99 },
        { amount: 5000, price: 199.99 }
    ],
    tokens: [
        { amount: 100, price: 1.99 },
        { amount: 250, price: 4.99 },
        { amount: 500, price: 9.99 },
        { amount: 1000, price: 19.99 },
        { amount: 2000, price: 39.99 },
        { amount: 5000, price: 99.99 },
        { amount: 10000, price: 199.99 }
    ],
    crystals: [
        { amount: 50, price: 1.99 },
        { amount: 150, price: 4.99 },
        { amount: 300, price: 9.99 },
        { amount: 600, price: 19.99 },
        { amount: 1200, price: 39.99 },
        { amount: 3000, price: 99.99 },
        { amount: 6000, price: 199.99 }
    ]
}

function ProductScreen() {
    const {id} = useParams()
    const navigate = useNavigate()
    const [product, setProduct] = useState({})
    const [quantity, setQuantity] = useState(1)
    const [showCheckout, setShowCheckout] = useState(false)
    const [userId, setUserId] = useState('')
    const [chosenProduct, setChosenProduct] = useState(null)

    // Memoized package retrieval
    const { currentUnit, currentPackages, design } = useMemo(() => {
        const unit = product.unit || 'Diamonds'
        const unitKey = unit.toLowerCase()
        const packages = PACKAGES_BY_UNIT[unitKey] || PACKAGES_BY_UNIT.diamonds
        const design = product.unitDesign || { emoji: '💎', color: '#28a745', borderColor: '#1e7e34' }
        
        return { currentUnit: unit, currentPackages: packages, design }
    }, [product.unit, product.unitDesign])

    useEffect(() => {
        async function fetchProduct() {
            try {
                const {data} = await axios.get(`http://localhost:8000/api/products/${id}/`)
                setProduct(data)
            } catch (err) {
                console.error('Error fetching product:', err)
            }
        }
        fetchProduct()
    }, [id])

    const handlePurchase = () => {
      const token = localStorage.getItem('authToken') || localStorage.getItem('user')
      if (!token) {
        // redirect unauthenticated users to login
        navigate('/login')
        return
      }
      setShowCheckout(true)
    }

  return (
    <div>
        <Link to ='/'className='btn btn-light my-3'>Home</Link>
        <Row>
            <Col md={3}>
                <Card className='shadow-lg' style={{ border: 'none', borderRadius: '15px', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
                        <Image 
                            src={product.image} 
                            alt={product.name} 
                            fluid 
                            className='d-block mx-auto rounded-3' 
                            style={{ maxHeight: '280px', width: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} 
                        />
                    </div>
                    <Card.Body style={{ padding: '0' }}>
                        <ListGroup variant="flush">
                            <ListGroup.Item style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
                                <h6 style={{ color: '#495057', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    📝 About
                                </h6>
                                <p style={{ color: '#6c757d', fontSize: '14px', lineHeight: '1.6', marginBottom: 0 }}>
                                    {product.description}
                                </p>
                            </ListGroup.Item>
                            <ListGroup.Item style={{ padding: '20px', backgroundColor: '#fff' }}>
                                <h6 style={{ color: '#495057', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    💳 Payment Methods
                                </h6>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {['GCash', 'Maya', 'Card', 'GrabPay', '7-Eleven', 'Coins.ph', 'Bank'].map((method, idx) => (
                                        <span 
                                            key={idx}
                                            style={{ 
                                                padding: '6px 12px', 
                                                backgroundColor: '#e9ecef', 
                                                borderRadius: '20px', 
                                                fontSize: '12px', 
                                                color: '#495057',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {method}
                                        </span>
                                    ))}
                                </div>
                            </ListGroup.Item>
                            <ListGroup.Item style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
                                <h6 style={{ color: '#495057', fontWeight: 'bold', marginBottom: '10px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    ⚡ Instant Delivery
                                </h6>
                                <p style={{ color: '#6c757d', fontSize: '14px', lineHeight: '1.6', marginBottom: 0 }}>
                                    Buy in-game currency in seconds! Simply enter your credentials, select the item, complete payment, and receive instant delivery to your {product.name} account.
                                </p>
                            </ListGroup.Item>
                        </ListGroup>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={5}>
                <ListGroup>
                    <ListGroup.Item>
                        <h3>{product.name}</h3>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        Description: {product.description}
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <div className='step-1-container p-3 border-2 rounded' style={{ borderColor: '#007bff', backgroundColor: '#f0f8ff' }}>
                          <div className='d-flex align-items-center mb-2'>
                            <span className='step-badge' style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: '#007bff',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              marginRight: '10px'
                            }}>
                              1
                            </span>
                            <label className='mb-0 fw-bold' style={{ color: '#007bff' }}>Enter User ID</label>
                          </div>
                          <input 
                            type='text' 
                            className='form-control' 
                            placeholder='Enter your User ID'
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                          />
                        </div>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <div className='step-2-container p-3 border-2 rounded' style={{ borderColor: design.color, backgroundColor: '#f0f8ff' }}>
                          <div className='d-flex align-items-center mb-3'>
                            <span className='step-badge' style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: design.color,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              marginRight: '10px'
                            }}>
                              2
                            </span>
                            <label className='mb-0 fw-bold' style={{ color: design.color }}>Choose Product</label>
                          </div>
                          <div style={{ minHeight: '300px', padding: '20px', border: `2px dashed ${design.color}`, borderRadius: '8px', backgroundColor: 'white', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', alignItems: 'center', justifyItems: 'center' }}>
                            {currentPackages.map((pkg, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setChosenProduct({ ...pkg, unit: currentUnit })}
                                style={{
                                  padding: '15px',
                                  borderRadius: '12px',
                                  border: chosenProduct?.amount === pkg.amount ? `3px solid ${design.color}` : `2px solid ${design.borderColor}`,
                                  backgroundColor: chosenProduct?.amount === pkg.amount ? `${design.color}20` : '#ffffff',
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                  transition: 'all 0.3s ease',
                                  boxShadow: chosenProduct?.amount === pkg.amount ? `0 4px 12px ${design.color}40` : '0 2px 4px rgba(0,0,0,0.1)',
                                  transform: chosenProduct?.amount === pkg.amount ? 'scale(1.05)' : 'scale(1)',
                                  width: '100%',
                                  maxWidth: '120px'
                                }}
                              >
                                {design.image ? (
                                  <img 
                                    src={design.image} 
                                    alt={currentUnit}
                                    style={{ width: '50px', height: '50px', objectFit: 'contain', marginBottom: '8px' }}
                                  />
                                ) : (
                                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: design.color, marginBottom: '8px' }}>
                                    {design.emoji}
                                  </div>
                                )}
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                                  {pkg.amount}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  ${pkg.price}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                    </ListGroup.Item>
                    {chosenProduct && (
                      <ListGroup.Item>
                        <div style={{ padding: '15px', backgroundColor: `${design.color}15`, borderRadius: '8px', border: `2px solid ${design.color}` }}>
                          <h6 style={{ color: design.color, marginBottom: '10px' }}>📦 Selected:</h6>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {design.image ? (
                              <img 
                                src={design.image} 
                                alt={currentUnit}
                                style={{ width: '35px', height: '35px', objectFit: 'contain' }}
                              />
                            ) : (
                              <span>{design.emoji}</span>
                            )}
                            <span>{chosenProduct.amount} {chosenProduct.unit}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                            ${chosenProduct.price}
                          </div>
                        </div>
                      </ListGroup.Item>
                    )}
                </ListGroup>
            </Col>
            <Col md={4}>
                <Card>
                    <ListGroup>
                        <ListGroup.Item>
                            <Col>Product: </Col>
                            <Col>{product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}</Col>
                        </ListGroup.Item>
                        <ListGroup.Item>
                            {chosenProduct ? (
                              <div>
                                <h5 style={{ color: design.color, marginBottom: '15px', fontWeight: 'bold', fontSize: '20px' }}>📦 Selected Package:</h5>
                                <div style={{ padding: '20px', backgroundColor: `${design.color}25`, borderRadius: '12px', border: `3px solid ${design.color}`, marginBottom: '15px', boxShadow: `0 4px 8px ${design.color}40` }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                    {design.image ? (
                                      <img 
                                        src={design.image} 
                                        alt={currentUnit}
                                        style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '32px' }}>{design.emoji}</span>
                                    )}
                                    <div>
                                      <div style={{ fontSize: '22px', fontWeight: 'bold', color: design.color, lineHeight: '1.2' }}>
                                        {chosenProduct.amount}
                                      </div>
                                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '4px' }}>
                                        {chosenProduct.unit}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: design.color, paddingTop: '12px', borderTop: `2px solid ${design.color}40`, textAlign: 'center' }}>
                                    ${chosenProduct.price}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ padding: '15px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '2px dashed #dee2e6' }}>
                                <p style={{ color: '#6c757d', marginBottom: 0, fontSize: '16px' }}>
                                  ⬅️ Choose a Product
                                </p>
                              </div>
                            )}
                        </ListGroup.Item>
                        {!userId.trim() && (
                          <ListGroup.Item>
                            <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107', textAlign: 'center' }}>
                              <p style={{ color: '#856404', fontWeight: 'bold', marginBottom: 0, fontSize: '15px' }}>
                                ⚠️ Must Enter User ID
                              </p>
                            </div>
                          </ListGroup.Item>
                        )}
                        <ListGroup.Item>
                            <Button
                                className='w-100'
                                variant='primary'
                                type='button'
                                disabled={product.countInStock === 0 || !chosenProduct || !userId.trim()}
                                onClick={handlePurchase}
                            >
                                Purchase
                            </Button>
                        </ListGroup.Item>
                        {/* Rating removed */}
                    </ListGroup>
                </Card>
            </Col>
        </Row>

        <CheckoutModal 
            show={showCheckout} 
            onHide={() => setShowCheckout(false)} 
            product={product}
            chosenProduct={chosenProduct}
            userId={userId}
        />
    </div>
    
  )
}

export default ProductScreen