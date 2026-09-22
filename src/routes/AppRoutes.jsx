import { Route, Routes } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import InvoiceDashboardPage from '../pages/InvoiceDashboardPage'
import VendorRequestPage from '../pages/VendorRequestPage'
import SubmissionSuccessPage from '../pages/SubmissionSuccessPage'
import NotFoundPage from '../pages/NotFoundPage'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import { AuthProvider } from '../context/AuthContext'

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/invoices" element={<ProtectedRoute role="user"><InvoiceDashboardPage /></ProtectedRoute>} />
        <Route path="/request-vendor" element={<ProtectedRoute role="guest"><VendorRequestPage /></ProtectedRoute>} />
        <Route path="/request-success" element={<ProtectedRoute role="guest"><SubmissionSuccessPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
