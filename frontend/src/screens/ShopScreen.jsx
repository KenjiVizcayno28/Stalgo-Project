import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Badge, Modal } from 'react-bootstrap'

const coinPackages = [
  { id: 'c1', name: 'Small Pack', coins: 500, price: 4.99 },
  { id: 'c2', name: 'Medium Pack', coins: 1200, price: 9.99 },
  { id: 'c3', name: 'Large Pack', coins: 3000, price: 19.99 },
]

const bundles = [
  { id: 'b1', name: 'Starter Bundle', description: 'Coins + 1 rare skin', costCoins: 1000 },
  { id: 'b2', name: 'Pro Bundle', description: 'More coins + 1 epic skin', costCoins: 2500 },
]

const skins = [
  { id: 's1', name: 'Crimson Blade', rarity: 'Rare', costCoins: 800 },
  { id: 's2', name: 'Celestial Armor', rarity: 'Epic', costCoins: 2000 },
]

function ShopScreen() {
  const [coinBalance, setCoinBalance] = useState(() => Number(localStorage.getItem('coinBalance') || 0))
  const [inventory, setInventory] = useState(() => JSON.parse(localStorage.getItem('inventory') || '[]'))
  const [showModal, setShowModal] = useState(false)
  const [modalContent, setModalContent] = useState(null)

  useEffect(() => {
    localStorage.setItem('coinBalance', String(coinBalance))
    // notify header by forcing a storage event for other tabs (not required here)
  }, [coinBalance])

  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory))
  }, [inventory])

  const buyCoinPackage = (pkg) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setModalContent({ title: 'Not Logged In', body: 'Please log in to purchase.' });
      setShowModal(true);
      return;
    }
    const purchase = { type: 'coin', product_name: pkg.name, coins: pkg.coins, price: pkg.price, game: pkg.game || 'General' };
    fetch('http://127.0.0.1:8000/api/purchases/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(purchase)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        setCoinBalance((b) => b + pkg.coins);
        // Add backend response to inventory
        setInventory((inv) => [...inv, {
          id: data.transaction_id || data.id,
          name: data.product_name,
          coins: data.coins,
          price: data.price,
          type: data.type || 'coin',
          game: data.game || 'General',
          status: data.status,
          date: data.created_at
        }]);
        setModalContent({ title: 'Purchase Complete', body: `Added ${pkg.coins} coins to your balance.` });
        setShowModal(true);
      })
      .catch(err => {
        setModalContent({ title: 'Error', body: 'Failed to complete purchase.' });
        setShowModal(true);
      });
  };

  const buyWithCoins = (item) => {
    if (coinBalance < item.costCoins) {
      setModalContent({ title: 'Insufficient Coins', body: `You need ${item.costCoins} coins but have ${coinBalance}. Purchase coins first.` });
      setShowModal(true);
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
      setModalContent({ title: 'Not Logged In', body: 'Please log in to purchase.' });
      setShowModal(true);
      return;
    }
    const purchase = {
      product_name: item.name,
      game: item.game || (item.rarity ? 'General' : 'General'),
      type: item.rarity ? 'skin' : 'bundle',
      price: null,
      coins: null,
      quantity: 1,
      cost_coins: item.costCoins
    };
    fetch('http://127.0.0.1:8000/api/purchases/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(purchase)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        setCoinBalance((b) => b - item.costCoins);
        setInventory((inv) => [...inv, {
          id: data.transaction_id || data.id,
          name: data.product_name,
          game: data.game || 'General',
          type: data.type || purchase.type,
          price: data.price,
          coins: data.coins,
          status: data.status,
          date: data.created_at
        }]);
        setModalContent({ title: 'Purchase Complete', body: `Added "${item.name}" to your inventory.` });
        setShowModal(true);
      })
      .catch(err => {
        setModalContent({ title: 'Error', body: 'Failed to complete purchase.' });
        setShowModal(true);
      });
  };

  return (
    <Container>
      <h2 className="py-3">Loot Shop</h2>

      <section className="mb-4">
        <h4>Coin Packages</h4>
        <Row>
          {coinPackages.map((p) => (
            <Col key={p.id} sm={12} md={4} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>{p.name}</Card.Title>
                  <Card.Text>{p.coins.toLocaleString()} coins</Card.Text>
                  <Card.Text className="fw-bold">${p.price}</Card.Text>
                  <Button onClick={() => buyCoinPackage(p)}>Buy</Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="mb-4">
        <h4>Bundles</h4>
        <Row>
          {bundles.map((b) => (
            <Col key={b.id} sm={12} md={6} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>{b.name} <Badge bg="secondary" className="ms-2">Bundle</Badge></Card.Title>
                  <Card.Text>{b.description}</Card.Text>
                  <Card.Text className="text-muted">Cost: {b.costCoins} coins</Card.Text>
                  <Button variant="success" onClick={() => buyWithCoins(b)}>Buy with Coins</Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="mb-4">
        <h4>Skins</h4>
        <Row>
          {skins.map((s) => (
            <Col key={s.id} sm={12} md={6} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>{s.name} <Badge bg="info" className="ms-2">{s.rarity}</Badge></Card.Title>
                  <Card.Text className="text-muted">Cost: {s.costCoins} coins</Card.Text>
                  <Button variant="primary" onClick={() => buyWithCoins(s)}>Buy with Coins</Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="mb-4">
        <h4>Your Balance</h4>
        <p>
          Coins: <strong>{coinBalance.toLocaleString()}</strong>
        </p>
        <h5>Inventory</h5>
        {inventory.length === 0 ? (
          <p>No items in inventory yet.</p>
        ) : (
          <Row>
            {inventory.map((it, idx) => (
              <Col key={idx} sm={12} md={4} className="mb-2">
                <Card>
                  <Card.Body>
                    <Card.Title>{it.name}</Card.Title>
                    {it.rarity && <Card.Text className="text-muted">{it.rarity}</Card.Text>}
                    <Card.Text className="text-muted">Acquired: {it.costCoins ? `${it.costCoins} coins` : (it.coins ? `${it.coins} coins` : '')}</Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </section>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{modalContent?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalContent?.body}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default ShopScreen
