import React, {useState, useEffect} from 'react'
import defaultProducts from '../products'
import {Row, Col} from 'react-bootstrap'
import Product from '../components/Product'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'

function HomeScreen() {
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('search');
    const searchIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];

    const [products, setProducts] = useState(defaultProducts)
    const [loading, setLoading] = useState(true)
    const [recommendations, setRecommendations] = useState([])
    const [loadingRecs, setLoadingRecs] = useState(true)
    
    const displayProducts = searchIds.length > 0 
        ? products.filter(p => searchIds.includes(p._id))
        : products;

    useEffect(() => {
        async function fetchProducts() {
            try {
                setLoading(true)
                const {data} = await axios.get('http://localhost:8000/api/products/')
                // Only update if we get valid data with images
                if (data && data.length > 0) {
                    setProducts(data)
                }
            } catch (err) {
                console.error('Error fetching products:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchProducts()
    }, [])

    useEffect(() => {
        async function fetchRecommendations() {
            try {
                setLoadingRecs(true)
                const token = localStorage.getItem('authToken')
                const config = token ? {
                    headers: { Authorization: `Token ${token}` }
                } : {}
                
                const {data} = await axios.get('http://localhost:8000/api/recommendations/', config)
                if (data && data.products) {
                    setRecommendations(data.products)
                }
            } catch (err) {
                console.error('Error fetching recommendations:', err)
            } finally {
                setLoadingRecs(false)
            }
        }
        fetchRecommendations()
    }, [])

  return (
    <div>
        {searchQuery ? (
            <h3 className='py-3 text-center'>🔍 Search results for "{searchQuery}"</h3>
        ) : (
            <h3 className='py-3 text-center'><i className='fas fa-fire'></i>Hottest<i className='fas fa-fire'></i></h3>
        )}        
        {loading ? (
            <div className="text-center py-5">
                <p>Loading products...</p>
            </div>
        ) : (
            <Row>
                {products && products.length > 0 ? (
                    displayProducts.map((product) => (
                        <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                            <Product product={product}/>
                        </Col>
                    ))
                ) : (
                    <Col className="text-center w-100">
                        <p>No products available</p>
                    </Col>
                )}
            </Row>
        )}
    
        {/* AI-POWERED RECOMMENDATIONS SECTION */}
        <h3 className='py-3 text-center'><i className='fas fa-thumbs-up'></i> Recommendations For You <i className='fas fa-thumbs-up'></i></h3>
        {loadingRecs ? (
            <div className="text-center py-4 text-muted">
                <p>Loading recommendations...</p>
            </div>
        ) : (
            <Row>
                {recommendations && recommendations.length > 0 ? (
                    recommendations.map((product) => (
                        <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                            <Product product={product}/>
                        </Col>
                    ))
                ) : (
                    <Col className="text-center w-100">
                        <p className="text-muted">No recommendations available</p>
                    </Col>
                )}
            </Row>
        )}
    </div>
  )
}

export default HomeScreen