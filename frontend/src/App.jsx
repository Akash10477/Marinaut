import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import PortalLogin from './pages/PortalLogin'
import PortalRegister from './pages/PortalRegister'
import Dashboard from './pages/Dashboard'
import Vessels from './pages/Vessels'
import VesselDetail from './pages/VesselDetail'
import Fines from './pages/Fines'
import IssueFine from './pages/IssueFine'
import FineDetail from './pages/FineDetail'
import Payments from './pages/Payments'
import ReceiptPage from './pages/ReceiptPage'
import Violations from './pages/Violations'
import Users from './pages/Users'
import AuditLog from './pages/AuditLog'
import VerifyReceipt from './pages/VerifyReceipt'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            {/* Public: scanning a receipt QR code lands here */}
            <Route path="/verify" element={<VerifyReceipt />} />
            <Route path="/verify/:txn" element={<VerifyReceipt />} />
            {/* Vessel Owner portal */}
            <Route path="/login" element={<PortalLogin portal="owner" key="owner-login" />} />
            <Route path="/register" element={<PortalRegister portal="owner" key="owner-register" />} />
            {/* Naval Police portal */}
            <Route path="/police/login" element={<PortalLogin portal="police" key="police-login" />} />
            <Route path="/police/register" element={<PortalRegister portal="police" key="police-register" />} />
            {/* Admin portal */}
            <Route path="/admin/login" element={<PortalLogin portal="admin" key="admin-login" />} />
            <Route path="/admin/register" element={<PortalRegister portal="admin" key="admin-register" />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="vessels" element={<Vessels />} />
              <Route path="vessels/:id" element={<VesselDetail />} />
              <Route path="fines" element={<Fines />} />
              <Route
                path="fines/new"
                element={
                  <ProtectedRoute roles={['admin', 'police']}>
                    <IssueFine />
                  </ProtectedRoute>
                }
              />
              <Route path="fines/:id" element={<FineDetail />} />
              <Route path="payments" element={<Payments />} />
              <Route path="receipts/:id" element={<ReceiptPage />} />
              <Route
                path="violations"
                element={
                  <ProtectedRoute roles={['admin', 'police']}>
                    <Violations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
