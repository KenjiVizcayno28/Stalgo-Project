import React, { useState } from 'react'
import { Container, Row, Col, Card, Badge, Button, Modal } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

const events = [
  {
    id: 'e-codm-1',
    game: 'Call of Duty Mobile',
    initials: 'CODM',
    item: 'Ghost Operator Skin',
    promo: 'LIMITED TIME',
    bonus: '+1000 coins',
    discount: '30% OFF',
    price: 4.99,
    costCoins: null,
    color: '#0b5cff',
    logo: 'CODM.jpg'
  },
  {
    id: 'e-ml-1',
    game: 'Mobile Legends',
    initials: 'ML',
    item: 'Aurora Epic Skin',
    promo: 'EVENT',
    bonus: 'Extra Emote',
    discount: '20% OFF',
    price: 3.99,
    costCoins: null,
    color: '#ff5a5f',
    logo: 'MLBB.jpg'
  },
  {
    id: 'e-lol-1',
    game: 'League of Legends',
    initials: 'LoL',
    item: 'Celestial Guardian Skin',
    promo: 'SALE',
    bonus: 'Ward Skin',
    discount: '25% OFF',
    price: 6.99,
    costCoins: null,
    color: '#8a2be2',
    logo: 'LOL.png'
  },
  {
    id: 'e-roblox-1',
    game: 'Roblox',
    initials: 'RBX',
    item: 'Retro Hat Bundle',
    promo: 'LIMITED TIME',
    bonus: 'Exclusive Badge',
    discount: '15% OFF',
    price: null,
    costCoins: 1500,
    color: '#ff4500',
    logo: 'Roblox.png'
  },
  {
    id: 'e-genshin-1',
    game: 'Genshin Impact',
    initials: 'GI',
    item: 'Paimon Themed Skin',
    promo: 'LIMITED TIME',
    bonus: 'Primogems + Bundle',
    discount: '25% OFF',
    price: 9.99,
    costCoins: null,
    color: '#6f42c1',
    logo: 'Genshin.jpg'
  },
  {
    id: 'e-honkai-1',
    game: 'Honkai: Star Rail',
    initials: 'HSR',
    item: 'Trailblazer Outfit',
    promo: 'EVENT',
    bonus: 'Stellar Jade Pack',
    discount: '20% OFF',
    price: 5.99,
    costCoins: null,
    color: '#ff6fb5',
    logo: 'Honkai.jpg'
  },
  {
    id: 'e-hok-1',
    game: 'Honor of Kings',
    initials: 'HOK',
    item: 'Kingslayer Skin',
    promo: 'SALE',
    bonus: 'Hero Shards',
    discount: '30% OFF',
    price: 7.99,
    costCoins: null,
    color: '#ff7a00',
    logo: 'HOK.png'
  },
  {
    id: 'e-lid-1',
    game: 'Love and Deepspace',
    initials: 'LID',
    item: 'Ethereal Suit',
    promo: 'LIMITED TIME',
    bonus: 'Cosmic Emote',
    discount: '15% OFF',
    price: null,
    costCoins: 800,
    color: '#2b9cff',
    logo: 'LID.jpg'
  }
]

function EventsScreen() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const openConfirm = (ev) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('user')
    if (!token) {
      navigate('/login')
      return
    }
    setSelected(ev); setShowConfirm(true); setResult(null)
  }

  const handleConfirmBuy = async () => {
    if (!selected) return;
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    if (!token) {
      navigate('/login');
      return;
    }
    
    let parsedUser = null;
    try {
      parsedUser = user ? JSON.parse(user) : null;
    } catch (err) {
      console.error('Failed to parse user', err);
    }

    // Helper function to submit purchase with retry logic
    const submitPurchase = () => fetch('/api/purchases/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({
        product_name: selected.item,
        product_id: selected.id,
        game: selected.game || 'General',
        type: 'event',
        coins: selected.costCoins || null,
        quantity: 1,
        unit: 'promo',
        price: selected.price || null,
        user_id_input: parsedUser?.username || '',
        payment_method: selected.costCoins ? 'coins' : 'paypal',
        notes: `Event: ${selected.item} from ${selected.game}`
      })
    });

    try {
      setShowConfirm(false);
      let res;
      try {
        res = await submitPurchase();
      } catch (networkErr) {
        // On network timeout, retry once after 3.5 seconds
        console.warn('Purchase request timed out, retrying...', networkErr);
        await new Promise(resolve => setTimeout(resolve, 3500));
        res = await submitPurchase();
      }

      const data = await res.json();
      if (!res.ok) {
        console.error('Purchase API error:', data);
        throw new Error(data?.error || JSON.stringify(data) || 'Failed to save purchase');
      }

      // save to inventory
      const inv = JSON.parse(localStorage.getItem('inventory') || '[]');
      inv.unshift({
        id: data.transaction_id || data.id,
        name: data.product_name,
        game: data.game,
        type: data.type || 'event',
        price: data.price,
        coins: data.coins,
        status: data.status,
        date: data.created_at
      });
      localStorage.setItem('inventory', JSON.stringify(inv));
      
      // deduct coins if purchase uses coins
      if (selected.costCoins) {
        const bal = Number(localStorage.getItem('coinBalance') || 0);
        localStorage.setItem('coinBalance', String(Math.max(0, bal - selected.costCoins)));
      }
      window.dispatchEvent(new Event('storage'));
      setResult({ title: 'Purchase Successful', body: `${selected.item} added to your inventory.` });
    } catch (err) {
      console.error('Purchase error:', err);
      const errMsg = err.message || 'Failed to complete purchase';
      const displayMsg = errMsg.includes('timeout') || errMsg.includes('Failed to fetch')
        ? 'Purchase processing timed out. Please wait 30-60 seconds and check your inventory, or try again.'
        : errMsg;
      setResult({ title: 'Error', body: displayMsg });
    }
  };
  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center py-3">
        <div>
          <h2 className="mb-0">Limited Time Offers</h2>
          <small className="text-muted">Limited-time offers and promos across popular games</small>
        </div>
      </div>

      <Row xs={1} sm={2} md={3} lg={3} className="g-3">
        {events.map((ev) => (
          <Col key={ev.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex flex-column">
                <div className="d-flex align-items-start mb-3">
                  {ev.logo ? (
                    <img
                      src={`/images/${ev.logo}`}
                      alt={`${ev.game} logo`}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, marginRight: 12 }}
                    />
                  ) : (
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: ev.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 18,
                      marginRight: 12
                    }}>
                      {ev.initials}
                    </div>
                  )}
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="mb-1">{ev.game}</h5>
                      <Badge bg="danger" pill>{ev.promo}</Badge>
                    </div>
                    <div className="text-muted small">Featured item</div>
                    <h6 className="mt-1"><strong>{ev.item}</strong></h6>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="small text-muted">Bonus</div>
                      <div className="fw-semibold">{ev.bonus}</div>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">Discount</div>
                      <div className="fw-bold text-success">{ev.discount}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => openConfirm(ev)}>Buy</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Purchase</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <div>
              <h5 className="mb-1">{selected.item}</h5>
              <div className="small text-muted mb-2">{selected.game}</div>
              <div className="mb-2">{selected.bonus}</div>
              <div className="fw-bold">{selected.price ? `$${selected.price.toFixed(2)}` : `${selected.costCoins.toLocaleString()} coins`}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirmBuy}>Confirm Buy</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!result} onHide={() => setResult(null)}>
        <Modal.Header closeButton>
          <Modal.Title>{result?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{result?.body}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setResult(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default EventsScreen
