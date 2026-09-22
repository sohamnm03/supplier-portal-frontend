import { Route, Routes } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
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
        <Route path="/request-vendor" element={<ProtectedRoute><VendorRequestPage /></ProtectedRoute>} />
        <Route path="/request-success" element={<ProtectedRoute><SubmissionSuccessPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
