import React, { useEffect, useState } from 'react'
import { Row, Col } from 'react-bootstrap'
import Product from '../components/Product'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'

function HomeScreen() {
    const [searchParams] = useSearchParams()
    const searchQuery = searchParams.get('search')
    const searchIds = searchParams.get('ids')?.split(',').filter(Boolean) || []

    const [products, setProducts] = useState([])
    const [hottestProducts, setHottestProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [recommendations, setRecommendations] = useState([])
    const [loadingRecs, setLoadingRecs] = useState(true)

    const searchResults = searchIds.length > 0
        ? products.filter((product) => searchIds.includes(product._id))
        : products

    const displayProducts = searchQuery || searchIds.length > 0
        ? searchResults
        : hottestProducts

    useEffect(() => {
        async function fetchProducts() {
            try {
                setLoading(true)
                const [productsResponse, hottestResponse] = await Promise.all([
                    axios.get('http://localhost:8000/api/products/'),
                    axios.get('http://localhost:8000/api/products/hottest/'),
                ])

                setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : [])
                setHottestProducts(Array.isArray(hottestResponse.data) ? hottestResponse.data.slice(0, 4) : [])
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
                    headers: { Authorization: `Token ${token}` },
                } : {}

                const { data } = await axios.get('http://localhost:8000/api/recommendations/', config)
                setRecommendations(Array.isArray(data?.products) ? data.products : [])
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
                    {displayProducts.length > 0 ? (
                        displayProducts.map((product) => (
                            <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                                <Product product={product} />
                            </Col>
                        ))
                    ) : (
                        <Col className="text-center w-100">
                            <p>No products available</p>
                        </Col>
                    )}
                </Row>
            )}

            <h3 className='py-3 text-center'><i className='fas fa-thumbs-up'></i> Recommendations For You <i className='fas fa-thumbs-up'></i></h3>
            {loadingRecs ? (
                <div className="text-center py-4 text-muted">
                    <p>Loading recommendations...</p>
                </div>
            ) : (
                <Row>
                    {recommendations.length > 0 ? (
                        recommendations.map((product) => (
                            <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                                <Product product={product} />
                            </Col>
                        ))
                    ) : (
                        <Col className="text-center w-100">
                            <p className="text-muted">No recommendations available</p>
                        </Col>
                    )}
                </Row>
            )}

            <h3 className='py-3 text-center'><i className='fas fa-gamepad'></i> Pick and Choose <i className='fas fa-gamepad'></i></h3>
            <Row>
                {products.length > 0 ? (
                    products.map((product) => (
                        <Col key={product._id} sm={12} md={6} lg={4} xl={3}>
                            <Product product={product} />
                        </Col>
                    ))
                ) : (
                    <Col className="text-center w-100">
                        <p className="text-muted">No games available</p>
                    </Col>
                )}
            </Row>
        </div>
    )
}

export default HomeScreen