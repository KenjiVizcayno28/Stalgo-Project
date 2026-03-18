import React, { useCallback, useEffect, useState } from 'react'
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Modal,
  Card,
  Col,
  Container,
  Form,
  Image,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap'
import axios from 'axios'

const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  unit: '',
  category: 'Game Top-Up',
  unitDesignEmoji: '',
  unitDesignColor: '#28a745',
  unitDesignBorderColor: '#1e7e34',
  inStock: true,
}

function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [supportTickets, setSupportTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [productImage, setProductImage] = useState(null)
  const [unitDesignImage, setUnitDesignImage] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [savingProduct, setSavingProduct] = useState(false)
  const [productAlert, setProductAlert] = useState(null)

  const token = localStorage.getItem('authToken')
  const storedUser = localStorage.getItem('user')
  const currentUser = storedUser ? JSON.parse(storedUser) : null
  const isAdmin = Boolean(currentUser?.is_superuser)

  const resetProductForm = () => {
    setProductForm(emptyProductForm)
    setProductImage(null)
    setUnitDesignImage(null)
    setEditingProductId(null)
  }

  const loadSupportTickets = useCallback(() => {
    try {
      const rawTickets = JSON.parse(localStorage.getItem('supportTickets') || '[]')
      const normalizedTickets = Array.isArray(rawTickets) ? rawTickets : []
      normalizedTickets.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      setSupportTickets(normalizedTickets)
    } catch (error) {
      console.warn('Failed to load support tickets from localStorage', error)
      setSupportTickets([])
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    if (!isAdmin) {
      setLoading(false)
      setProductAlert({
        type: 'warning',
        message: 'Your current account is not an admin account. Log in with a superuser to manage products.',
      })
      return
    }

    setLoading(true)
    try {
      const config = { headers: { Authorization: `Token ${token}` } }
      const [statsRes, purchasesRes, productsRes] = await Promise.all([
        axios.get('/api/admin/stats/', config),
        axios.get('/api/admin/purchases/', config),
        axios.get('/api/admin/products/', config),
      ])

      setStats(statsRes.data)
      setPurchases(purchasesRes.data)
      setProducts(productsRes.data)
      loadSupportTickets()
    } catch (error) {
      console.error('Admin fetch error', error)

      if (error.response?.status === 401) {
        setProductAlert({
          type: 'warning',
          message: 'Your session expired. Log in again with your admin account.',
        })
      } else if (error.response?.status === 403) {
        setProductAlert({
          type: 'warning',
          message: 'This account does not have admin access. Log in with a superuser account.',
        })
      } else {
        setProductAlert({
          type: 'danger',
          message: 'Failed to load admin data because the backend is unavailable or returned an unexpected error.',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [isAdmin, loadSupportTickets, token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handler = () => loadSupportTickets()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [loadSupportTickets])

  const openSupportTicketsCount = supportTickets.filter((ticket) => (ticket.status || 'open') === 'open').length

  const handleProductFormChange = (event) => {
    const { name, value, type, checked } = event.target
    setProductForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const populateProductForm = (product) => {
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      unit: product.unit || '',
      category: product.category || 'Game Top-Up',
      unitDesignEmoji: product.unitDesign?.emoji || '',
      unitDesignColor: product.unitDesign?.color || '#28a745',
      unitDesignBorderColor: product.unitDesign?.borderColor || '#1e7e34',
      inStock: Boolean(product.countInStock),
    })
    setProductImage(null)
    setUnitDesignImage(null)
    setEditingProductId(product._id)
    setProductAlert(null)
  }

  const buildProductPayload = () => {
    const formData = new FormData()
    formData.append('name', productForm.name)
    formData.append('description', productForm.description)
    formData.append('price', productForm.price || '0')
    formData.append('unit', productForm.unit)
    formData.append('category', productForm.category)
    formData.append('unit_design_emoji', productForm.unitDesignEmoji)
    formData.append('unit_design_color', productForm.unitDesignColor)
    formData.append('unit_design_border_color', productForm.unitDesignBorderColor)
    formData.append('in_stock', productForm.inStock ? 'true' : 'false')

    if (productImage) {
      formData.append('image', productImage)
    }

    if (unitDesignImage) {
      formData.append('unit_design_image', unitDesignImage)
    }

    return formData
  }

  const handleProductSubmit = async (event) => {
    event.preventDefault()
    setSavingProduct(true)
    setProductAlert(null)

    try {
      const payload = buildProductPayload()

      const config = { headers: { Authorization: `Token ${token}` } }

      if (editingProductId) {
        await axios.put(`/api/admin/products/${editingProductId}/update/`, payload, config)
      } else {
        await axios.post('/api/admin/products/create/', payload, config)
      }

      setProductAlert({
        type: 'success',
        message: editingProductId ? 'Product updated successfully.' : 'Product created successfully.',
      })
      resetProductForm()
      fetchData()
    } catch (error) {
      console.error('Product save error', error)
      setProductAlert({
        type: 'danger',
        message: 'Failed to save product. Check the form values and uploaded files.',
      })
    } finally {
      setSavingProduct(false)
    }
  }

  const handleStockToggle = async (product) => {
    const formData = new FormData()
    formData.append('in_stock', product.countInStock > 0 ? 'false' : 'true')

    try {
      const config = { headers: { Authorization: `Token ${token}` } }
      await axios.patch(`/api/admin/products/${product._id}/update/`, formData, config)
      setProductAlert({
        type: 'success',
        message: `${product.name} is now ${product.countInStock > 0 ? 'out of stock' : 'back in stock'}.`,
      })
      fetchData()
    } catch (error) {
      console.error('Stock toggle error', error)
      setProductAlert({
        type: 'danger',
        message: 'Failed to update stock status.',
      })
    }
  }

  if (!token) {
    return (
      <Container className="py-5 text-center">
        <h3>Admin Dashboard</h3>
        <p className="text-muted">You must be logged in as a superuser to view this page.</p>
      </Container>
    )
  }

  if (!isAdmin) {
    return (
      <Container className="py-5 text-center">
        <h3>Admin Dashboard</h3>
        <p className="text-muted">Your current login is not a superuser account. Sign in with the admin account you just created.</p>
      </Container>
    )
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center py-3">
        <h2 className="mb-0">Admin Dashboard</h2>
      </div>

      {productAlert && <Alert variant={productAlert.type}>{productAlert.message}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Row className="g-3 mb-3">
            <Col md={4}>
              <Card>
                <Card.Body>
                  <Card.Title>Total Orders</Card.Title>
                  <Card.Text style={{ fontSize: '1.5rem' }}>{stats?.total_orders ?? 0}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card>
                <Card.Body>
                  <Card.Title>Total Revenue</Card.Title>
                  <Card.Text style={{ fontSize: '1.5rem' }}>${Number(stats?.total_revenue || 0).toFixed(2)}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card>
                <Card.Body>
                  <Card.Title>Products</Card.Title>
                  <Card.Text style={{ fontSize: '1.5rem' }}>{products.length}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Accordion className="mb-3" alwaysOpen={false}>
            <Accordion.Item eventKey="recent-purchases">
              <Accordion.Header>
                <span className="d-flex align-items-center gap-2">
                  <span>Recent Purchases</span>
                  <Badge bg="secondary">{purchases.length}</Badge>
                </span>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <Table striped hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Txn ID</th>
                      <th>User</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-3">No purchases yet</td>
                      </tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase.id || purchase.transaction_id}>
                          <td style={{ minWidth: 160 }}>{purchase.transaction_id || purchase.id}</td>
                          <td>{purchase.user?.username || '-'}</td>
                          <td>{purchase.product_name}</td>
                          <td>{purchase.quantity}</td>
                          <td>${Number(purchase.price || 0).toFixed(2)}</td>
                          <td>{purchase.status}</td>
                          <td>{new Date(purchase.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          <Accordion className="mb-3" alwaysOpen={false}>
            <Accordion.Item eventKey="support-inbox">
              <Accordion.Header>
                <span className="d-flex align-items-center gap-2">
                  <span>Support Inbox</span>
                  <Badge bg={openSupportTicketsCount > 0 ? 'danger' : 'secondary'}>{supportTickets.length}</Badge>
                </span>
              </Accordion.Header>
              <Accordion.Body className="p-0">
                <Table striped hover responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>From</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-3">No support tickets yet</td>
                      </tr>
                    ) : (
                      supportTickets.map((ticket) => (
                        <tr key={ticket.id || `${ticket.email}-${ticket.date}`}>
                          <td style={{ minWidth: 140 }}>{ticket.id || '-'}</td>
                          <td>
                            <div>{ticket.name || '-'}</div>
                            <small className="text-muted">{ticket.email || '-'}</small>
                          </td>
                          <td>{ticket.subject || 'No subject'}</td>
                          <td>
                            <Badge bg={(ticket.status || 'open') === 'open' ? 'warning' : 'success'} text={(ticket.status || 'open') === 'open' ? 'dark' : 'light'}>
                              {(ticket.status || 'open').toString().toUpperCase()}
                            </Badge>
                          </td>
                          <td>{ticket.date ? new Date(ticket.date).toLocaleString() : '-'}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => setSelectedTicket(ticket)}
                            >
                              Read
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          <Row className="g-3">
            <Col lg={5}>
              <Card>
                <Card.Header>{editingProductId ? 'Edit Product' : 'Create Product'}</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleProductSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control name="name" value={productForm.name} onChange={handleProductFormChange} required />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="description"
                        value={productForm.description}
                        onChange={handleProductFormChange}
                        required
                      />
                    </Form.Group>

                    <Row className="g-2">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Price</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.01"
                            min="0"
                            name="price"
                            value={productForm.price}
                            onChange={handleProductFormChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Unit Name</Form.Label>
                          <Form.Control
                            name="unit"
                            value={productForm.unit}
                            onChange={handleProductFormChange}
                            placeholder="Diamonds, Shells, Robux..."
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Category</Form.Label>
                      <Form.Control name="category" value={productForm.category} onChange={handleProductFormChange} />
                    </Form.Group>

                    <Row className="g-2">
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Unit Emoji</Form.Label>
                          <Form.Control
                            name="unitDesignEmoji"
                            value={productForm.unitDesignEmoji}
                            onChange={handleProductFormChange}
                            placeholder="Optional"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Unit Color</Form.Label>
                          <Form.Control type="color" name="unitDesignColor" value={productForm.unitDesignColor} onChange={handleProductFormChange} />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Border Color</Form.Label>
                          <Form.Control type="color" name="unitDesignBorderColor" value={productForm.unitDesignBorderColor} onChange={handleProductFormChange} />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Product Image</Form.Label>
                      <Form.Control type="file" accept="image/*" onChange={(event) => setProductImage(event.target.files?.[0] || null)} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Unit Design Image</Form.Label>
                      <Form.Control type="file" accept="image/*" onChange={(event) => setUnitDesignImage(event.target.files?.[0] || null)} />
                    </Form.Group>

                    <Form.Check
                      className="mb-3"
                      type="switch"
                      name="inStock"
                      checked={productForm.inStock}
                      onChange={handleProductFormChange}
                      label="In stock"
                    />

                    <div className="d-flex gap-2">
                      <Button type="submit" disabled={savingProduct}>
                        {savingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                      </Button>
                      {editingProductId && (
                        <Button variant="outline-secondary" onClick={resetProductForm}>
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={7}>
              <Card>
                <Card.Header>Product Catalog</Card.Header>
                <Card.Body className="p-0">
                  <Table striped hover responsive className="mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>Preview</th>
                        <th>Name</th>
                        <th>Unit</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-3">No products yet</td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product._id}>
                            <td>
                              {product.image ? (
                                <Image src={product.image} alt={product.name} rounded style={{ width: 56, height: 56, objectFit: 'cover' }} />
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              <div className="fw-semibold">{product.name}</div>
                              <div className="small text-muted">
                                {product.description.slice(0, 80)}{product.description.length > 80 ? '...' : ''}
                              </div>
                            </td>
                            <td>
                              <div>{product.unit}</div>
                              <div className="small text-muted d-flex align-items-center gap-2">
                                {product.unitDesign?.image && (
                                  <Image
                                    src={product.unitDesign.image}
                                    alt={product.unit}
                                    roundedCircle
                                    style={{ width: 20, height: 20, objectFit: 'cover' }}
                                  />
                                )}
                                {product.unitDesign?.emoji || ''}
                              </div>
                            </td>
                            <td>${Number(product.price || 0).toFixed(2)}</td>
                            <td>
                              <Badge bg={product.countInStock > 0 ? 'success' : 'secondary'}>
                                {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <Button size="sm" variant="outline-primary" onClick={() => populateProductForm(product)}>
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant={product.countInStock > 0 ? 'outline-danger' : 'outline-success'}
                                  onClick={() => handleStockToggle(product)}
                                >
                                  {product.countInStock > 0 ? 'Take Off Stock' : 'Put On Stock'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <TicketDetailsModal ticket={selectedTicket} onHide={() => setSelectedTicket(null)} />
    </Container>
  )
}

function TicketDetailsModal({ ticket, onHide }) {
  return (
    <Modal show={Boolean(ticket)} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Support Ticket Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!ticket ? null : (
          <>
            <p className="mb-1"><strong>Ticket ID:</strong> {ticket.id || '-'}</p>
            <p className="mb-1"><strong>Name:</strong> {ticket.name || '-'}</p>
            <p className="mb-1"><strong>Email:</strong> {ticket.email || '-'}</p>
            <p className="mb-1"><strong>Subject:</strong> {ticket.subject || 'No subject'}</p>
            <p className="mb-1"><strong>Status:</strong> {(ticket.status || 'open').toString().toUpperCase()}</p>
            <p className="mb-3"><strong>Date:</strong> {ticket.date ? new Date(ticket.date).toLocaleString() : '-'}</p>
            <div className="border rounded p-2 bg-light">
              <strong>Message</strong>
              <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>{ticket.message || 'No message content.'}</p>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AdminDashboard
