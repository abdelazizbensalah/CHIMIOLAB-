import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Layouts & Pages
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewProduct from './pages/products/NewProduct';
import Products from './pages/Products';
import QrGenerator from './pages/QrGenerator';
import TpSessions from './pages/TpSessions';
import NewTpSession from './pages/tp_sessions/NewTpSession';
import TpSessionDetail from './pages/tp_sessions/TpSessionDetail';
import Materials from './pages/Materials';
import NewMaterial from './pages/materials/NewMaterial';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Rooms from './pages/Rooms';
import Requests from './pages/Requests';
import PublicProductPage from './pages/PublicProductPage';

function LegacyPublicRedirect() {
  useEffect(() => {
    window.location.replace('/chimiolab/index.html');
  }, []);

  return null;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/public" element={<LegacyPublicRedirect />} />
          <Route path="/product/:id" element={<PublicProductPage />} />
          <Route path="/product/public/:id" element={<PublicProductPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/new" element={<NewProduct />} />
              <Route path="/products/:id/edit" element={<NewProduct />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/materials/new" element={<NewMaterial />} />
              <Route path="/materials/:id/edit" element={<NewMaterial />} />
              <Route path="/qr-generator" element={<QrGenerator />} />
              <Route path="/tp-sessions" element={<TpSessions />} />
              <Route path="/tp-sessions/new" element={<NewTpSession />} />
              <Route path="/tp-sessions/:id" element={<TpSessionDetail />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/settings" element={<Settings />} />
              {/* Add more routes here later */}
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
