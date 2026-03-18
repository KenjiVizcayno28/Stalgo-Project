import React, { useState } from 'react'
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import CheckoutModal from '../components/CheckoutModal'

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
    price: 4.99,
    costCoins: null,
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
    price: 3.99,
    costCoins: null,
    color: '#2b9cff',
    logo: 'LID.jpg'
  }
]

function EventsScreen() {
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [brokenLogos, setBrokenLogos] = useState({})
  const navigate = useNavigate()

  const openCheckout = (ev) => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      navigate('/login')
      return
    }
    setSelectedEvent(ev)
    setShowCheckout(true)
  }

  const handleCheckoutClose = () => {
    setShowCheckout(false)
    setSelectedEvent(null)
  }

  const renderEventLogo = (ev) => {
    const isBroken = brokenLogos[ev.id]
    if (ev.logo && !isBroken) {
      return (
        <img
          src={`/images/${ev.logo}`}
          alt={`${ev.game} logo`}
          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, marginRight: 12 }}
          onError={() => setBrokenLogos((current) => ({ ...current, [ev.id]: true }))}
        />
      )
    }

    return (
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
    )
  }

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
                  {renderEventLogo(ev)}
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
                    <Button variant="primary" size="sm" onClick={() => openCheckout(ev)}>Buy</Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <CheckoutModal 
        show={showCheckout} 
        onHide={handleCheckoutClose}
        saleItem={selectedEvent}
        userId=""
      />
    </Container>
  )
}

export default EventsScreen
