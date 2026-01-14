import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Signup, Login, Profile, ForgetPassword, VerifyEmail, ResetPassword } from './components'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import Navbar from './components/ui/Navbar'
import Home from './pages/Home'
import PageNotFound from './pages/PageNotFound'
import Breadcrumbs from './components/ui/Breadcrumbs'
import CountryPage from './pages/PostPages/CountryPage'
import CityPage from './pages/PostPages/CityPage'
//import GlobalPage from './pages/PostPages/GlobalPage'
import PostPage from './pages/PostPages/PostPage'
import CountryThreadPage from './pages/ThreadPages/CountryThreadPage'
import ThreadDetailPage from './pages/ThreadPages/ThreadDetailPage'
import ThreadPage from './pages/ThreadPages/ThreadPage'
import CreatePostPage from './pages/PostPages/CreatePostPage'
import CreateThreadPage from './pages/ThreadPages/CreateThreadPage'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Toaster richColors/>
        <Routes>
          <Route path="/" element={<Home />} />
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
          {/* Create Pages for Blog and Thread */}
          <Route path="/create-post" element={
            <ProtectedRoute>
              <CreatePostPage />
            </ProtectedRoute>
          } />
          <Route path="/create-thread" element={
            <ProtectedRoute>
              <CreateThreadPage />
            </ProtectedRoute>
          } />
          {/* Post Pages with Location Navigation */}
          <Route path="/countries/:countryCode" element={<CountryPage />} />
          <Route path="/countries/:countryCode/:citySlug" element={<CityPage />} />
          {/* <Route path="/global-posts" element={<GlobalPage />} /> */}
          
          {/* Thread Pages */}
          <Route path="/threads" element={<ThreadPage />} />
          <Route path="/countries/:countryCode/threads" element={<CountryThreadPage />} />
          <Route path="/u/:username/threads/:slug" element={<ThreadDetailPage />} />
          
          {/* Individual Post Page (Public) */}
          <Route path="/profile/:username/posts/:slug" element={<PostPage />} />

          {/* Redirect all unknown routes to a 404 page */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
