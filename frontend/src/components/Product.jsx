import React, { useState } from 'react'
// Rating removed per request
import { Card, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import CheckoutModal from './CheckoutModal'
import axios from 'axios'

function Product({product}) {
  const [showCheckout, setShowCheckout] = useState(false)
  const navigate = useNavigate()

  const trackProductClick = async () => {
    const token = localStorage.getItem('authToken')
    if (token) {
      try {
        await axios.post('http://localhost:8000/api/track-click/', {
          product_id: product._id,
          product_name: product.name
        }, {
          headers: { Authorization: `Token ${token}` }
        })
      } catch (err) {
        console.log('Click tracking failed:', err)
      }
    }
  }

  const handleProductClick = () => {
    trackProductClick()
    navigate(`/product/${product._id}`)
  }

  return (
    <>
      <Card className='product-card my-3 p-3 rounded shadow-xl' bg='primary' border='light'>
              <div onClick={handleProductClick} style={{cursor: 'pointer'}}>
                  <Card.Img src={product.image} variant='top' className='rounded-5' />
              </div>

              <Card.Body>
                  <div onClick={handleProductClick} style={{cursor: 'pointer'}}>
                      <Card.Title as='div'>
                          <h6><strong>{product.name}</strong></h6>
                      </Card.Title>
                  </div>
                  <Card.Text as='div'>
                        {/* Rating removed */}
                      <h5 className='my-2'>${product.price}</h5>
                      {product.countInStock === 0 && (
                        <p className='text-danger fw-bold mt-2'>
                          <i className='fas fa-exclamation-circle me-1'></i>Out of Stock
                        </p>
                      )}
                  </Card.Text>
                  <Button 
                    variant={product.countInStock > 0 ? 'success' : 'secondary'} 
                    className='w-100 mt-2'
                    onClick={handleProductClick}
                    disabled={product.countInStock === 0}
                  >
                    <i className='fas fa-shopping-cart me-2'></i>{product.countInStock > 0 ? 'Buy Now' : 'Out of Stock'}
                  </Button>
              </Card.Body>
      </Card>

      <CheckoutModal 
        show={showCheckout} 
        onHide={() => setShowCheckout(false)} 
        product={product}
      />
    </>
  )
}

export default Product