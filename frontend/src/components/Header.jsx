import React, { useState, useEffect, useRef } from 'react'
import { Navbar, Nav, NavDropdown, Container, Image, Button, Form, FormControl, ListGroup } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import products from '../products'
import axios from 'axios'
import ContactModal from './ContactModal'
import HelpCenterModal from './HelpCenterModal'
import FAQModal from './FAQModal'

function Header() {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLlmLoading, setIsLlmLoading] = useState(false);
    const searchRef = useRef();
    // Search logic: filter products by name (case-insensitive, partial match)
    useEffect(() => {
      if (search.trim().length === 0) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      const results = products.filter(p =>
        p.name.toLowerCase().includes(search.trim().toLowerCase())
      );
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, [search]);

    // Hide dropdown when clicking outside
    useEffect(() => {
      function handleClickOutside(event) {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
          setShowDropdown(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  const [user, setUser] = useState(null)
  const [showContact, setShowContact] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showFAQ, setShowFAQ] = useState(false)
  const navigate = useNavigate()
  

  const openOnly = (which) => {
    // ensure only one modal is visible at a time
    setShowContact(false)
    setShowHelp(false)
    setShowFAQ(false)
    if (which === 'contact') setShowContact(true)
    if (which === 'help') setShowHelp(true)
    if (which === 'faq') setShowFAQ(true)
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error('Error parsing user from storage:', e)
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await axios.post('/api/logout/', {}, {
          headers: {
            Authorization: `Token ${token}`
          }
        })
      }
      // Clear auth and user data and purge inventory on logout
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('inventory')
      setUser(null)
      navigate('/')
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
      // Ensure local cleanup even if API logout fails
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('inventory')
      setUser(null)
      navigate('/')
    }
  }

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (search.trim().length === 0) return;
    setIsLlmLoading(true);
    setShowDropdown(false);
    try {
      const response = await axios.post('/api/llm-search/', { query: search });
      const ids = response.data.ids || [];
      // Navigate to home with search results
      navigate(`/?search=${encodeURIComponent(search)}&ids=${ids.join(',')}`);
    } catch (err) {
      console.error('LLM search error:', err);
    } finally {
      setIsLlmLoading(false);
    }
  };

  return (
    <Navbar expand="lg" variant="dark" collapseOnSelect className="store-navbar">
      <Container>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Profile drawer removed - left placeholder for spacing */}
        </div>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <Image
            src='/images/thelootstoplogo.png'
            alt='TheLootStop Logo'
            style={{ height: '72px', width: 'auto' }}
            className='d-inline-block me-2'
          />
          <span className='store-brand-text'>TheLootStop</span>
        </Navbar.Brand>
        {/* LLM BEING IMPLEMENTED, TESTING */}
        <div ref={searchRef} className='store-search-wrap'>
          <Form className="d-flex" onSubmit={handleSearchSubmit} autoComplete="off">
            <FormControl
              type="search"
              placeholder="Search products..."
              className="me-2 store-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setShowDropdown(searchResults.length > 0)}
            />
          </Form>
          {(showDropdown || isLlmLoading) && (
            <ListGroup className='store-search-results'>
              {isLlmLoading && (
                <ListGroup.Item disabled>🔍 Searching with AI...</ListGroup.Item>
              )}
              {searchResults.map(product => (
                <ListGroup.Item
                  key={product._id}
                  action
                  onClick={() => {
                    setSearch('');
                    setShowDropdown(false);
                    navigate(`/product/${product._id}`);
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{product.name}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/"><i className="fas fa-home me-1 store-nav-icon"></i> Home</Nav.Link>
            <Nav.Link as={Link} to="/inventory"><i className='fas fa-boxes me-1 store-nav-icon'></i> Inventory</Nav.Link>
            <Nav.Link as={Link} to="/events"><i className='fas fa-bolt me-1 store-nav-icon'></i> Sales</Nav.Link>
            <NavDropdown title={<><i className='fas fa-life-ring me-1 store-nav-icon'></i> Support</>} id="support-dropdown">
              <NavDropdown.Item onClick={(e) => { e.preventDefault(); openOnly('help') }}>Help Center</NavDropdown.Item>
              <NavDropdown.Item onClick={(e) => { e.preventDefault(); openOnly('faq') }}>FAQ</NavDropdown.Item>
              <NavDropdown.Item onClick={(e) => { e.preventDefault(); openOnly('contact') }}>Contact Support</NavDropdown.Item>
              <NavDropdown.Divider />
            </NavDropdown>
            {/* Coins UI removed per request */}

            {user ? (
              <NavDropdown title={<><i className='fas fa-user-circle'></i> {user.username}</> } id="user-dropdown">
                {user.is_superuser && (
                  <NavDropdown.Item as={Link} to="/admin">
                    <i className="fas fa-tools me-2"></i>Admin Dashboard
                  </NavDropdown.Item>
                )}
                <NavDropdown.Item as={Link} to="/profile">
                  <i className="fas fa-user me-2"></i>Profile
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/settings">
                  <i className="fas fa-cog me-2"></i>Settings
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/security">
                  <i className="fas fa-shield-alt me-2"></i>Security & 2FA
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt me-2"></i>Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} to="/login">
                  <Button variant="outline-light" size="sm" className="me-2 store-login-btn">
                    <i className="fas fa-sign-in-alt me-1"></i>Login
                  </Button>
                </Nav.Link>
                <Nav.Link as={Link} to="/signup">
                  <Button variant="success" size="sm" className='store-signup-btn'>
                    <i className="fas fa-user-plus me-1"></i>Sign Up
                  </Button>
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
        {/* ProfileDrawer removed */}
        <ContactModal show={showContact} onHide={() => setShowContact(false)} />
        <HelpCenterModal show={showHelp} onHide={() => setShowHelp(false)} />
        <FAQModal show={showFAQ} onHide={() => setShowFAQ(false)} />
      </Container>
    </Navbar>
  )
}

export default Header

// Contact modal instance