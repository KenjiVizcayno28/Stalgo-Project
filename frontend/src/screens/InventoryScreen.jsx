import React, { useState, useEffect, useMemo } from 'react'
import { Container, Row, Col, Card, Badge, Button, Form } from 'react-bootstrap'

// Map game keys to public image filenames (place images in public/images)
const GAME_LOGOS = {
  CODM: '/images/CODM.jpg',
  ML: '/images/MLBB.jpg',
  LOL: '/images/LOL.png',
  Roblox: '/images/Roblox.png',
  HOK: '/images/HOK.png',
  Genshin: '/images/Genshin.jpg',
  Honkai: '/images/Honkai.jpg',
}

const TYPE_LABELS = [
  { key: 'all', label: 'All' },
  { key: 'skin', label: 'Skins' },
  { key: 'bundle', label: 'Bundles' },
]

const normalizeType = (item) => {
  const rawType = (item?.type || item?.purchase_type || '').toString().trim().toLowerCase()
  if (rawType === 'skin' || rawType === 'skins') return 'skin'
  if (rawType === 'bundle' || rawType === 'bundles') return 'bundle'
  if (rawType === 'coin' || rawType === 'coins') return 'coin'

  const name = (item?.name || item?.product_name || '').toString().toLowerCase()
  if (name.includes('bundle')) return 'bundle'
  return item?.coins ? 'coin' : 'skin'
}

const normalizeInventoryItem = (item) => ({
  ...item,
  name: item?.name || item?.product_name || 'Item',
  game: item?.game || 'General',
  type: normalizeType(item),
})

function InventoryScreen() {
  const [inventory, setInventory] = useState(() => JSON.parse(localStorage.getItem('inventory') || '[]').map(normalizeInventoryItem))
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('authToken'))
  const [filterType, setFilterType] = useState('all')
  const [filterGame, setFilterGame] = useState('all')

  useEffect(() => {
    const handler = () => setInventory(JSON.parse(localStorage.getItem('inventory') || '[]').map(normalizeInventoryItem))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
    const onStorage = (e) => {
      if (e.key === 'authToken') setIsAuthenticated(!!e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Fetch purchases from backend after login, merge with localStorage, and update inventory state
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    fetch('/api/purchases/', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`
      }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        // Map backend purchase structure to frontend inventory shape
        const mapped = data.map(p => ({
          id: p.transaction_id || p.id,
          name: p.product_name,
          quantity: p.quantity,
          price: p.price,
          status: p.status,
          date: p.created_at,
          game: p.game,
          type: p.type,
          coins: p.coins
        })).map(normalizeInventoryItem);
        // Merge backend purchases with local inventory, avoiding duplicates
        const existing = JSON.parse(localStorage.getItem('inventory') || '[]').map(normalizeInventoryItem);
        const backendIds = new Set(mapped.map(p => p.id));
        const merged = [...mapped, ...existing.filter(p => !backendIds.has(p.id))];
        setInventory(merged);
        localStorage.setItem('inventory', JSON.stringify(merged));
      })
      .catch(err => {
        console.warn('Failed to fetch purchases from API', err);
        // Fall back to local storage if fetch fails
      });
  }, [isAuthenticated]);

  // Build list of games available in inventory for filter select
  const games = useMemo(() => {
    const setGames = new Set()
    inventory.forEach(it => {
      if (it.game) setGames.add(it.game)
    })
    return Array.from(setGames)
  }, [inventory])

  const filtered = useMemo(() => {
    return inventory.filter(it => {
      if (filterType !== 'all' && normalizeType(it) !== filterType) return false
      if (filterGame !== 'all' && (it.game || 'General') !== filterGame) return false
      return true
    })
  }, [inventory, filterType, filterGame])

  const statusVariant = (status) => {
    const s = (status || 'Completed').toLowerCase()
    if (s === 'completed') return 'success'
    if (s === 'pending') return 'warning'
    if (s === 'redeemed') return 'secondary'
    return 'primary'
  }

  if (!isAuthenticated) {
    return (
      <Container>
        <Card className="text-center py-5">
          <Card.Body>
            <Card.Title>Inventory is available for logged-in accounts</Card.Title>
            <Card.Text className="text-muted">Please log in to view your purchased items.</Card.Text>
            <Button as="a" href="/login" variant="primary">Log in</Button>
          </Card.Body>
        </Card>
      </Container>
    )
  }

  return (
    <Container>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 py-3">
        <div>
          <h2 className="mb-1">Inventory</h2>
          <p className="text-muted mb-0">All purchased items: coins, skins, bundles and event promos.</p>
        </div>
      </div>

      <Card className="mb-3 p-3">
        <div className="d-flex flex-column flex-md-row gap-2 align-items-start">
          <div className="d-flex gap-2 flex-wrap">
            {TYPE_LABELS.map(t => (
              <Button key={t.key} variant={filterType === t.key ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setFilterType(t.key)}>{t.label}</Button>
            ))}
          </div>

          <div className="ms-md-auto d-flex gap-2 align-items-center">
            <Form.Select size="sm" value={filterGame} onChange={(e) => setFilterGame(e.target.value)} style={{minWidth: 160}}>
              <option value="all">All games</option>
              {games.map(g => <option key={g} value={g}>{g}</option>)}
            </Form.Select>
            <div className="text-muted small">Showing {filtered.length} item{filtered.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </Card>

      {inventory.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <Card.Title>No purchases yet</Card.Title>
              <Card.Text className="text-muted">When you buy skins or bundles they will appear here. Try visiting the Home page to see whats available.</Card.Text>
            <Button href="/" variant="primary">Browse</Button>
          </Card.Body>
        </Card>
      ) : (
        <Row xs={1} sm={1} md={2} lg={3} className="g-3">
          {filtered.map(it => {
            const gameKey = it.game || 'General'
            const logo = GAME_LOGOS[gameKey] || '/images/thelootstoplogo.png'
            const title = it.name || (it.coins ? `${it.coins.toLocaleString()} coins` : 'Item')
            const quantity = it.quantity || it.coins || 1
            const status = it.status || 'Completed'
            return (
              <Col key={it.id}>
                <Card className="h-100 shadow-sm">
                  <Card.Body className="d-flex gap-3">
                    <div style={{width:72, height:72, flexShrink:0}} className="d-flex align-items-center justify-content-center">
                      <img src={logo} alt={gameKey} style={{maxWidth:'100%', maxHeight:'100%', objectFit:'contain'}} />
                    </div>
                    <div className="flex-grow-1 d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-bold">{title}</div>
                          <div className="small text-muted">{gameKey} • {it.type ? it.type.charAt(0).toUpperCase() + it.type.slice(1) : 'Coin'}</div>
                        </div>
                        <div className="text-end">
                          <Badge bg={statusVariant(status)} className="text-capitalize">{status}</Badge>
                        </div>
                      </div>

                      <div className="mt-2 small text-muted">Purchased: {it.date ? new Date(it.date).toLocaleString() : '—'}</div>
                      <div className="mt-auto d-flex justify-content-between align-items-center">
                        <div className="small text-muted">Amount: <span className="fw-bold">{quantity.toLocaleString()}</span></div>
                        <div className="small text-muted">{it.price ? `$${Number(it.price).toFixed(2)}` : ''}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </Container>
  )
}

export default InventoryScreen
