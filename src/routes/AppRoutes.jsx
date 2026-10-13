import { Route, Routes } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import InvoiceDashboardPage from '../pages/InvoiceDashboardPage'
import UpdateRequestsPage from '../pages/UpdateRequestsPage'
import VendorRequestPage from '../pages/VendorRequestPage'
import ApplicationStatusPage from '../pages/ApplicationStatusPage'
import NotFoundPage from '../pages/NotFoundPage'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'
import { FORM_STAGES, STAGES, WAITING_STAGES } from '../utils/stages'

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/invoices" element={<ProtectedRoute stages={[STAGES.active]}><InvoiceDashboardPage /></ProtectedRoute>} />
        <Route path="/update-requests" element={<ProtectedRoute stages={[STAGES.active]}><UpdateRequestsPage /></ProtectedRoute>} />
        <Route path="/request-vendor" element={<ProtectedRoute stages={FORM_STAGES}><VendorRequestPage /></ProtectedRoute>} />
        <Route path="/application-status" element={<ProtectedRoute stages={WAITING_STAGES}><ApplicationStatusPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
