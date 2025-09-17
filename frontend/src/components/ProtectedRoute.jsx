import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // If still loading initial auth state, show loading
  if (isLoading) {
    return (
      <Loader
        fullScreen={false}
        message="Loading..."
        subtitle="Please wait while we authenticate your session."
      />
    );
  }
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, show the children which is the protected component
  return children;
};

export default ProtectedRoute;
