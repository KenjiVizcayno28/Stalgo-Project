import React, { useEffect, useState, useRef } from 'react'
import { Container, Card, Row, Col, Button, Image, Spinner, Alert } from 'react-bootstrap'
import axios from 'axios'
import TransactionHistory from './TransactionHistory'
import './ProfileScreen.css'

function ProfileScreen() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      setAlert({ type: 'danger', message: 'You must be logged in to view your profile.' })
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/profile/', {
          headers: { Authorization: `Token ${token}` }
        })
        setProfile(res.data)
      } catch (err) {
        console.error('Error fetching profile:', err.response || err)
          // Try fallback to cached user in localStorage so UI still shows profile when backend is down
          const cached = localStorage.getItem('user')
          if (cached) {
            try {
              const user = JSON.parse(cached)
              setProfile({ user })
              setAlert({ type: 'warning', message: 'Showing cached profile (offline).' })
            } catch (e) {
              console.error('Failed parsing cached user:', e)
              setAlert({ type: 'danger', message: 'Failed to load profile.' })
            }
          } else {
            setAlert({ type: 'danger', message: 'Failed to load profile.' })
          }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await axios.post('/api/logout/', {}, { headers: { Authorization: `Token ${token}` } })
      }
    } catch (e) {
      console.warn('Logout error:', e.response || e)
    }
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  if (loading) return (
    <Container className="py-5 d-flex justify-content-center align-items-center" style={{minHeight:200}}>
      <Spinner />
    </Container>
  )

  // If profile failed to load or user is not authenticated, show an alert and simple view
  if (!profile) {
    return (
      <Container className="py-5 profile-page">
        {alert && <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>{alert.message}</Alert>}
        {!alert && (
          <Alert variant="warning">No profile available. Please log in.</Alert>
        )}
      </Container>
    )
  }

  return (
    <Container className="py-5 profile-page">
      {alert && <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>{alert.message}</Alert>}

      <Row className="mb-4">
        <Col md={8} lg={6}>
          <Card className="profile-card shadow-sm p-3">
            <Row className="g-3 align-items-center">
              <Col xs={3} sm={2} className="text-center">
                <div className="avatar-clickable" onClick={() => fileInputRef.current?.click()}>
                  {profile.profile_picture ? (
                    <Image src={profile.profile_picture} rounded style={{ width: 64, height: 64, objectFit: 'cover', cursor: 'pointer' }} />
                  ) : (
                    <div className="avatar-placeholder" style={{ cursor: 'pointer' }}>
                      <i className="fas fa-user" />
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files && e.target.files[0]
                  if (!file) return
                  setUploading(true)
                  try {
                    const token = localStorage.getItem('authToken')
                    const fd = new FormData()
                    fd.append('profile_picture', file)
                    const res = await axios.put('/api/profile/update/', fd, {
                      headers: { Authorization: `Token ${token}`, 'Content-Type': 'multipart/form-data' }
                    })
                    const newProfile = res.data.data
                    setProfile(newProfile)
                    if (newProfile.user) localStorage.setItem('user', JSON.stringify(newProfile.user))
                    setAlert({ type: 'success', message: 'Profile picture updated.' })
                  } catch (err) {
                    console.error('Upload error:', err.response || err)
                    setAlert({ type: 'danger', message: 'Failed to upload image.' })
                  } finally {
                    setUploading(false)
                    e.target.value = ''
                  }
                }} />
              </Col>
              <Col>
                <h3 className="mb-1">{profile.user?.username || 'User'}</h3>
                <div className="text-muted">{profile.user?.first_name || ''} {profile.user?.last_name || ''}</div>
                <div className="text-muted">{profile.user?.email || ''}</div>
                <div className="mt-2">
                  <Button variant="danger" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
                {uploading && (
                  <div className="mt-2 text-muted small d-flex align-items-center gap-2">
                    <Spinner animation="border" size="sm" />
                    Uploading profile picture...
                  </div>
                )}
                {/* Upload now happens by clicking the avatar; status shown via alerts */}
              </Col>
            </Row>
            {profile?.bio && <p className="mt-3 mb-0 text-muted small">{profile.bio}</p>}
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <TransactionHistory />
        </Col>
      </Row>
    </Container>
  )
}

export default ProfileScreen
