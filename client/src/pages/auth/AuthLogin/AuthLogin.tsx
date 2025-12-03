/**
 * Login Page Component
 * Handles Google OAuth authentication via Express/Passport.js backend
 * Clean, modern design with branding
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Alert, Typography, Space, theme } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { useAuth } from "../../../contexts";
import { authService } from "../../../services/auth.Service";
import { getUserDestination } from "../../../utils/navigationHelpers";

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

    // Redirect if already authenticated - use centralized navigation logic
    if (!loading && isAuthenticated && user) {
      console.log('[AuthLogin] User authenticated, redirecting...', user.email);
      
      // Use centralized navigation helper - single source of truth!
      const destination = getUserDestination(user);
      navigate(destination);
      
      // Stop loading state after navigation
      setIsLoggingIn(false);
    }
  }, [isAuthenticated, loading, user, navigate, searchParams]);

  /**
   * Handle Google OAuth login
   * Simplified to avoid race conditions - let useEffect handle navigation
   */
  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoggingIn(true);
    
    try {
      // Login with Google and verify token with backend
      const response = await authService.loginWithGoogle();
      
      console.log('[AuthLogin] Login successful:', response.user.email);
      
      // Simply refetch user and let useEffect handle navigation
      // This eliminates race conditions and duplicate navigation logic
      await refetchUser();
      
      console.log('[AuthLogin] User refetched successfully');
      
      // useEffect will automatically navigate based on user status
      // No manual navigation needed - single source of truth!
      
    } catch (err) {
      console.error('[AuthLogin] Login failed:', err);
      const errorMessage = (err as Error).message || 'Failed to sign in. Please try again.';
      
      // Show user-friendly error for domain validation
      if (errorMessage.includes('@smu.edu.ph') || errorMessage.includes('personal account')) {
        setError('Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Please sign in with your SMU account.');
      } else {
        setError(errorMessage);
      }
      
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
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/smu-building.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <Card
          bordered={false}
          style={{
            maxWidth: 420,
            width: "100%",
            margin: "0 24px",
            textAlign: "center",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            backgroundColor: "rgba(255, 255, 255, 0.98)",
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
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('/smu-building.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: "24px",
      }}
    >
      <Card
        bordered={false}
        style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Space 
          direction="vertical" 
          size={32} 
          style={{ width: "100%", padding: "24px 0" }}
        >
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <img 
              src="/system_logo.svg" 
              alt="SMU PureTrack Logo" 
              style={{ 
                width: 100, 
                height: 100, 
                marginBottom: 24,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.08))",
              }} 
            />
            <Title 
              level={2} 
              style={{ 
                marginBottom: 8,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.5px",
              }}
            >
              SMU PureTrack
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: 15,
                display: "block",
                marginTop: 8,
              }}
            >
              Sign in to access your dashboard
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{
                borderRadius: 8,
              }}
            />
          )}

          {/* Google Sign-In Button */}
          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined style={{ fontSize: 18 }} />}
            onClick={handleGoogleLogin}
            loading={isLoggingIn}
            disabled={isLoggingIn}
            block
            style={{
              height: 52,
              fontSize: 16,
              fontWeight: 500,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              border: "none",
            }}
          >
            {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: 12,
                display: "block",
                lineHeight: 1.6,
              }}
            >
              Secure authentication powered by Google
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
