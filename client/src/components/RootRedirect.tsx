import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import { Spin } from 'antd';
import { getUserDestination } from '../utils/navigationHelpers';

/**
 * Smart Root Redirect
 * Redirects users to appropriate destination using centralized navigation logic
 */
export const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Use centralized navigation helper - single source of truth!
  const destination = getUserDestination(user);
  return <Navigate to={destination} replace />;
};
