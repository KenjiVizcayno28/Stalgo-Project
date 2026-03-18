import React, { useState } from 'react'
// Rating removed per request
import { Card, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import CheckoutModal from './CheckoutModal'
import axios from 'axios'

function Product({product}) {
  const [showCheckout, setShowCheckout] = useState(false)
  const navigate = useNavigate()

  const trackProductClick = async () => {
    const token = localStorage.getItem('authToken')
    if (token) {
      try {
        await axios.post('/api/track-click/', {
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
      <Card className='product-card my-3 shadow-xl'>
              <div className='product-image-wrap' onClick={handleProductClick} style={{cursor: 'pointer'}}>
                  <Card.Img src={product.image} variant='top' className='product-image' />
              </div>

              <Card.Body>
                  <div onClick={handleProductClick} style={{cursor: 'pointer'}}>
                      <Card.Title as='div'>
                          <h6 className='product-title'>{product.name}</h6>
                      </Card.Title>
                  </div>
                  <Card.Text as='div'>
                        {/* Rating removed */}
                      <h5 className='my-2'>${product.price}</h5>
                  </Card.Text>
                  <Button 
                    variant={product.countInStock > 0 ? 'success' : 'secondary'} 
                    className='w-100 mt-2 product-buy-btn'
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