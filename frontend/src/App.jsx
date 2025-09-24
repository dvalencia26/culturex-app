import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Signup, Login, Profile, ForgetPassword, VerifyEmail, ResetPassword } from './components'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import Navbar from './components/ui/Navbar'
import Home from './pages/Home'
import PageNotFound from './pages/PageNotFound'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Toaster richColors/>
        <Routes>
          <Route path="/" element={
            <>
              <Home />
            </>
          } />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile/:handle" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/otp/verify" element={<VerifyEmail />} />
          <Route path="/forget_password" element={<ForgetPassword />} />
          <Route path="/password-reset-confirm/:uidb64/:token" element={<ResetPassword />} />

          {/* Redirect all unknown routes to a 404 page */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
    
 

export default App
