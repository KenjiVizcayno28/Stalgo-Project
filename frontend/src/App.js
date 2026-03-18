import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Container } from 'react-bootstrap';
import HomeScreen from './screens/HomeScreen';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductScreen from './screens/ProductScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import SecurityScreen from './screens/SecurityScreen';
import InventoryScreen from './screens/InventoryScreen';
import EventsScreen from './screens/EventsScreen';
import SupportScreen from './screens/SupportScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import TransactionHistory from './screens/TransactionHistory';
import AdminDashboard from './screens/AdminDashboard';

function App() {
  return (
    <Router>
      <Header />
      <main className='py-3 storefront-main'>

        <Container className='store-shell'>
          <Routes>
            <Route path='/' element={<HomeScreen />} exact />
            <Route path='/product/:id' element={<ProductScreen />} />
            {/* Coins route removed per request */}
            <Route path='/inventory' element={<InventoryScreen />} />
            <Route path='/events' element={<EventsScreen />} />
            <Route path='/transactions' element={<TransactionHistory />} />
            <Route path='/profile/transactions' element={<TransactionHistory />} />
            <Route path='/admin' element={<AdminDashboard />} />
            <Route path='/support' element={<SupportScreen />} />
            <Route path='/profile' element={<ProfileScreen />} />
            <Route path='/settings' element={<SettingsScreen />} />
            <Route path='/login' element={<LoginScreen />} />
            <Route path='/signup' element={<SignupScreen />} />
            <Route path='/security' element={<SecurityScreen />} />
          </Routes>
        </Container>

      </main>
      <Footer />
    </Router>

  );
}

export default App;
