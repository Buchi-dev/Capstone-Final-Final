/**
 * Login Page Component
 * Handles Google OAuth authentication via Express/Passport.js backend
 * Clean, modern design with branding
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, theme, Divider } from "antd";
import { GoogleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useAuth } from "../../../contexts/AuthContext";
import { authService } from "../../../services/auth.Service";
import { auth } from "../../../config/firebase.config";
import { onAuthStateChanged } from "firebase/auth";

const { Title, Text } = Typography;

/**
 * AuthLogin Component
 * Provides Google OAuth login functionality
 */
export default function AuthLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, refetchUser } = useAuth();
  const { token } = theme.useToken();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Check for error in URL params (from failed OAuth redirect)
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.');
    }

    // Redirect if already authenticated
    if (!loading && isAuthenticated && user) {
      console.log('[AuthLogin] User authenticated, redirecting...', user);
      
      // Route based on user role and status
      if (user.status === 'suspended') {
        navigate('/auth/account-suspended');
      } else if (user.status === 'pending') {
        // Check if profile is complete (has department and phone)
        if (!user.department || !user.phoneNumber) {
          // New user without complete profile - go to account completion
          navigate('/auth/account-completion');
        } else {
          // Profile complete - go to pending approval
          navigate('/auth/pending-approval');
        }
      } else if (user.status === 'active') {
        // Active user - redirect to appropriate dashboard
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'staff') {
          navigate('/staff/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
      
      // Stop loading state after navigation
      setIsLoggingIn(false);
    }
  }, [isAuthenticated, loading, user, navigate, searchParams]);

  /**
   * Handle Google OAuth login
   */
  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    
    try {
      // Login with Google and verify token with backend
      const response = await authService.loginWithGoogle();
      
      console.log('[AuthLogin] Login successful, user:', response.user);
      
      // Wait for Firebase auth state to be fully established
      // This ensures subsequent API calls will have auth.currentUser available
      await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            console.log('[AuthLogin] Firebase auth state confirmed for:', firebaseUser.email);
            unsubscribe();
            resolve();
          }
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          unsubscribe();
          resolve();
        }, 5000);
      });
      
      // Add a small delay to ensure Firebase is fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now refetch the user through AuthContext
      // At this point, auth.currentUser is ready, so the API interceptor will work
      console.log('[AuthLogin] Refetching user through AuthContext...');
      await refetchUser();
      
      console.log('[AuthLogin] User refetched successfully');
      
      // If we reach here and still not authenticated, something is wrong
      // Navigate manually based on the login response
      if (!isAuthenticated) {
        console.warn('[AuthLogin] AuthContext not updated, navigating manually');
        const loggedInUser = response.user;
        
        if (loggedInUser.status === 'suspended') {
          navigate('/auth/account-suspended');
        } else if (loggedInUser.status === 'pending') {
          if (!loggedInUser.department || !loggedInUser.phoneNumber) {
            navigate('/auth/account-completion');
          } else {
            navigate('/auth/pending-approval');
          }
        } else if (loggedInUser.status === 'active') {
          if (loggedInUser.role === 'admin') {
            navigate('/admin/dashboard');
          } else if (loggedInUser.role === 'staff') {
            navigate('/staff/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
        setIsLoggingIn(false);
      }
      // Otherwise, useEffect will handle navigation and stop loading
      
    } catch (err: any) {
      console.error('[AuthLogin] Login failed:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)), url('/smu-building.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Card
          style={{
            maxWidth: 480,
            width: "100%",
            margin: "0 16px",
            textAlign: "center",
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ fontSize: 24, color: token.colorPrimary }}>
              Loading...
            </div>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)), url('/smu-building.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "24px 16px",
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              Water Quality Monitoring
            </Title>
            <Text type="secondary">
              Sign in to access your dashboard
            </Text>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* Error Alert */}
          {error && (
            <Alert
              message="Authentication Error"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {/* Info Alert */}
          <Alert
            message="Google Account Required"
            description="You need a Google account to sign in. New users will need admin approval before accessing the system."
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
          />

          {/* Google Sign-In Button */}
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            loading={isLoggingIn}
            disabled={isLoggingIn}
            block
            style={{
              height: 48,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
