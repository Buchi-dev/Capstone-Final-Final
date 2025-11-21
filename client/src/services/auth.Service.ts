/**
 * Authentication Service Layer
 * Handles all authentication operations via Firebase Authentication + Express backend
 * 
 * Authentication Flow:
 * 1. Client authenticates with Firebase (Google OAuth, Email/Password, etc.)
 * 2. Client sends Firebase ID token to backend for verification
 * 3. Backend verifies token, syncs user to MongoDB, and returns user profile
 * 4. All subsequent API calls include Firebase ID token in Authorization header
 * 
 * @module services/auth.Service
 */

import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase.config';
import { apiClient, getErrorMessage } from '../config/api.config';
import { AUTH_ENDPOINTS } from '../config/endpoints';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthUser {
  _id: string;
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  role: 'admin' | 'staff';
  status: 'active' | 'pending' | 'suspended';
  profileComplete?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface VerifyTokenResponse {
  success: boolean;
  user: AuthUser;
  message: string;
}

export interface CurrentUserResponse {
  success: boolean;
  user: AuthUser;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

export class AuthService {
  
  /**
   * Verify Firebase ID token and sync user to database
   * This is called after successful Firebase authentication
   * 
   * @param idToken - Firebase ID token from client-side authentication
   * @returns Promise with user data
   * @throws {Error} If token verification fails
   * @example
   * const firebaseUser = await signInWithPopup(auth, googleProvider);
   * const idToken = await firebaseUser.user.getIdToken();
   * const response = await authService.verifyToken(idToken);
   */
  async verifyToken(idToken: string): Promise<VerifyTokenResponse> {
    try {
      const response = await apiClient.post<VerifyTokenResponse>(
        AUTH_ENDPOINTS.VERIFY_TOKEN,
        { idToken },
        {
          // Explicitly set the Authorization header with the fresh token
          // This bypasses the interceptor which might use a cached/old token
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        }
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Token verification error:', message);
      throw new Error(message);
    }
  }

  /**
   * Get current authenticated user from backend
   * Requires valid Firebase ID token in Authorization header
   * 
   * @returns Promise with user data
   * @throws {Error} If user is not authenticated
   * @example
   * const { user } = await authService.getCurrentUser();
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    try {
      const response = await apiClient.get<CurrentUserResponse>(
        AUTH_ENDPOINTS.CURRENT_USER
      );
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Get current user error:', message);
      throw new Error(message);
    }
  }

  /**
   * Check authentication status
   * Does not require authentication - returns status
   * 
   * @returns Promise with authentication status
   * @example
   * const { authenticated, user } = await authService.checkStatus();
   */
  async checkStatus(): Promise<AuthStatusResponse> {
    try {
      const response = await apiClient.get<AuthStatusResponse>(
        AUTH_ENDPOINTS.STATUS
      );
      return response.data;
    } catch (error: any) {
      console.error('[AuthService] Check status error:', error);
      return { authenticated: false, user: null };
    }
  }

  /**
   * Check authentication status (alias for checkStatus)
   * Used by AuthContext for compatibility
   * 
   * @returns Promise with authentication status
   * @example
   * const { authenticated, user } = await authService.checkAuthStatus();
   */
  async checkAuthStatus(): Promise<AuthStatusResponse> {
    return this.checkStatus();
  }

  /**
   * Initiate Google OAuth login
   * Uses Firebase Google Sign-In popup
   * 
   * @returns Promise with user data after successful login
   * @throws {Error} If login fails
   * @example
   * const user = await authService.loginWithGoogle();
   */
  async loginWithGoogle(): Promise<VerifyTokenResponse> {
    try {
      // Sign in with Google via Firebase
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get ID token from Firebase
      const idToken = await result.user.getIdToken();
      
      // Verify token with backend and sync user to database
      const response = await this.verifyToken(idToken);
      
      return response;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Google login error:', message);
      throw new Error(message);
    }
  }

  /**
   * Logout user
   * Signs out from both Firebase and backend
   * 
   * @returns Promise that resolves when logout is complete
   * @example
   * await authService.logout();
   */
  async logout(): Promise<LogoutResponse> {
    try {
      // Sign out from Firebase first
      await firebaseSignOut(auth);
      
      // Notify backend
      const response = await apiClient.post<LogoutResponse>(
        AUTH_ENDPOINTS.LOGOUT
      );
      
      return response.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('[AuthService] Logout error:', message);
      throw new Error(message);
    }
  }
}

// ============================================================================
// EXPORT SERVICE INSTANCE
// ============================================================================

export const authService = new AuthService();