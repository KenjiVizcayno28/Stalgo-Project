import React, { useEffect, useState, useMemo } from 'react'
import { Container, Table, Card, Button, Form, Row, Col } from 'react-bootstrap'

function formatDate(dt) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleString() } catch (e) { return dt }
}

function TransactionHistory() {
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('inventory') || '[]'))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const handler = () => setTransactions(JSON.parse(localStorage.getItem('inventory') || '[]'))
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // If user is authenticated, fetch transactions from backend and merge with local state
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    fetch('/api/purchases/', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`
      }
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(JSON.stringify(data))

        // Map backend purchase structure to frontend transaction shape, including game
        const mapped = data.map(p => ({
          id: p.transaction_id || p.id,
          name: p.product_name,
          type: p.type || '',
          unit: p.unit || '',
          quantity: p.quantity,
          price: p.price,
          status: p.status,
          date: p.created_at,
          game: p.game || ''
        }))
        
        // Merge backend purchases with local inventory, avoiding duplicates
        const existing = JSON.parse(localStorage.getItem('inventory') || '[]')
        const backendIds = new Set(mapped.map(p => p.id))
        const merged = [...mapped, ...existing.filter(p => !backendIds.has(p.id))]
        
        setTransactions(merged)
        // keep localStorage in sync for other components that read it
        localStorage.setItem('inventory', JSON.stringify(merged))
      })
      .catch(err => {
        console.warn('Failed to fetch purchases from API', err)
        // Fall back to local storage if fetch fails
      })
  }, [])

  const statuses = useMemo(() => {
    const s = new Set(transactions.map(t => (t.status || 'Completed')))
    return ['all', ...Array.from(s)]
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (statusFilter !== 'all' && (t.status || 'Completed') !== statusFilter) return false
      if (!query) return true
      const q = query.toLowerCase()
      return (t.name && t.name.toLowerCase().includes(q)) || (t.game && t.game.toLowerCase().includes(q)) || (t.id && String(t.id).toLowerCase().includes(q))
    }).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [transactions, query, statusFilter])

  const exportCsv = () => {
    if (!transactions || transactions.length === 0) return
    const headers = ['transactionId','item','game','type','quantity','price','status','date']
    const rows = transactions.map(t => ([
      t.id || '',
      t.name || '',
      t.game || '',
      t.unit || t.type || '',
      t.quantity || t.coins || '',
      t.price != null ? t.price : '',
      t.status || 'Completed',
      t.date || '',
    ]))
    const csv = [headers.join(','), ...rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transactions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-start py-3">
        <div>
          <h2 className="mb-1">Transaction History</h2>
          <p className="text-muted mb-0">A record of your purchases: amounts, times, dates and status.</p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <Card className="mb-3 p-3">
        <Row className="g-2 align-items-center">
          <Col md={6}>
            <Form.Control placeholder="Search by item, game or transaction id" value={query} onChange={e=>setQuery(e.target.value)} />
          </Col>
          <Col md={3}>
            <Form.Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
            </Form.Select>
          </Col>
        </Row>
      </Card>

      {filtered.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <Card.Title>No transactions found</Card.Title>
            <Card.Text className="text-muted">Your purchases will appear here. Make a purchase to generate a transaction record.</Card.Text>
          </Card.Body>
        </Card>
      ) : (
        <Table striped hover responsive className="align-middle">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Item</th>
              <th>Game</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Status</th>
              <th>Date / Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={(t.id||Math.random()) + (t.date||'')}>
                <td style={{minWidth:120}}>{t.id || '—'}</td>
                <td>{t.name || (t.coins ? `${t.coins.toLocaleString()} coins` : 'Item')}</td>
                <td>{t.game ? t.game : 'General'}</td>
                <td>{t.unit || (t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Unit')}</td>
                <td>{t.quantity || t.coins || 1}</td>
                <td>{t.price != null ? `$${Number(t.price).toFixed(2)}` : '—'}</td>
                <td>{t.status || 'Completed'}</td>
                <td>{formatDate(t.date)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  )
}

export default TransactionHistory
