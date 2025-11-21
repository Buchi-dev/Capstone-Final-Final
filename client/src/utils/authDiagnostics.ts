/**
 * Authentication Diagnostics Utility
 * Helps troubleshoot authentication issues
 */

import { apiClient } from '../config/api.config';
import { auth } from '../config/firebase.config';

/**
 * Mask sensitive token for security
 * Shows first 10 and last 10 characters with *** in the middle
 */
function maskToken(token: string): string {
  if (!token || token.length < 30) {
    return '***MASKED***';
  }
  
  const start = token.substring(0, 10);
  const end = token.substring(token.length - 10);
  return `${start}...***...${end}`;
}

export interface AuthDiagnostics {
  timestamp: string;
  headers: {
    authorization: string;
    contentType?: string;
    origin?: string;
    tokenLength?: number;
  };
  firebaseToken: {
    uid: string;
    email: string;
    emailVerified: boolean;
    exp: string;
    iat: string;
    isExpired: boolean;
  } | null;
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    department: string;
    hasCompletedProfile: boolean;
    createdAt: string;
    lastLogin?: string;
  } | null;
  errors: Array<{
    step: string;
    error: string;
    code?: string;
    firebaseUid?: string;
  }>;
  summary: {
    canAuthenticate: boolean;
    issues: number;
  };
}

export interface DiagnosticsResponse {
  success: boolean;
  diagnostics: AuthDiagnostics;
  error?: string;
}

/**
 * Run authentication diagnostics
 * Calls the backend diagnostic endpoint to identify authentication issues
 */
export async function runAuthDiagnostics(): Promise<DiagnosticsResponse> {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        diagnostics: {
          timestamp: new Date().toISOString(),
          headers: { authorization: 'Missing' },
          firebaseToken: null,
          user: null,
          errors: [{ step: 'Firebase Auth', error: 'No current user' }],
          summary: { canAuthenticate: false, issues: 1 },
        },
      };
    }

    // Get fresh token
    const idToken = await currentUser.getIdToken(true);
    
    // Call diagnostic endpoint
    const response = await apiClient.post<DiagnosticsResponse>(
      '/health/diagnose-auth',
      {},
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('[Diagnostics] Error running diagnostics:', error);
    
    return {
      success: false,
      diagnostics: {
        timestamp: new Date().toISOString(),
        headers: { authorization: 'Error' },
        firebaseToken: null,
        user: null,
        errors: [
          {
            step: 'Diagnostic Request',
            error: error.message || 'Unknown error',
          },
        ],
        summary: { canAuthenticate: false, issues: 1 },
      },
      error: error.message,
    };
  }
}

/**
 * Pretty print diagnostics to console
 */
export function printDiagnostics(diagnostics: AuthDiagnostics): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 AUTHENTICATION DIAGNOSTICS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Timestamp: ${diagnostics.timestamp}`);
  console.log('');
  
  console.log('📋 Headers:');
  // Mask the Authorization header to prevent token exposure
  const authHeader = diagnostics.headers.authorization;
  const maskedAuth = authHeader.startsWith('Bearer ') 
    ? `Bearer ${maskToken(authHeader.substring(7))}`
    : maskToken(authHeader);
  console.log(`  Authorization: ${maskedAuth}`);
  if (diagnostics.headers.tokenLength) {
    console.log(`  Token Length: ${diagnostics.headers.tokenLength}`);
  }
  console.log('');

  if (diagnostics.firebaseToken) {
    console.log('🔥 Firebase Token:');
    console.log(`  UID: ${diagnostics.firebaseToken.uid}`);
    console.log(`  Email: ${diagnostics.firebaseToken.email}`);
    console.log(`  Email Verified: ${diagnostics.firebaseToken.emailVerified}`);
    console.log(`  Issued At: ${diagnostics.firebaseToken.iat}`);
    console.log(`  Expires: ${diagnostics.firebaseToken.exp}`);
    console.log(`  Is Expired: ${diagnostics.firebaseToken.isExpired}`);
    console.log('');
  }

  if (diagnostics.user) {
    console.log('👤 User Account:');
    console.log(`  ID: ${diagnostics.user.id}`);
    console.log(`  Email: ${diagnostics.user.email}`);
    console.log(`  Role: ${diagnostics.user.role}`);
    console.log(`  Status: ${diagnostics.user.status}`);
    console.log(`  Department: ${diagnostics.user.department || 'Not set'}`);
    console.log(`  Profile Complete: ${diagnostics.user.hasCompletedProfile ? 'Yes' : 'No'}`);
    console.log(`  Created: ${diagnostics.user.createdAt}`);
    if (diagnostics.user.lastLogin) {
      console.log(`  Last Login: ${diagnostics.user.lastLogin}`);
    }
    console.log('');
  }

  if (diagnostics.errors && diagnostics.errors.length > 0) {
    console.log('❌ Issues Found:');
    diagnostics.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. [${error.step}] ${error.error}`);
      if (error.code) {
        console.log(`     Code: ${error.code}`);
      }
      if (error.firebaseUid) {
        console.log(`     Firebase UID: ${error.firebaseUid}`);
      }
    });
    console.log('');
  }

  console.log('📊 Summary:');
  console.log(`  Can Authenticate: ${diagnostics.summary.canAuthenticate ? '✅ Yes' : '❌ No'}`);
  console.log(`  Total Issues: ${diagnostics.summary.issues}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Run diagnostics and print results
 * Useful for debugging in development
 */
export async function diagnoseAndPrint(): Promise<DiagnosticsResponse> {
  const result = await runAuthDiagnostics();
  printDiagnostics(result.diagnostics);
  return result;
}

// Make available in window for easy debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).authDiagnostics = {
    run: runAuthDiagnostics,
    print: diagnoseAndPrint,
  };
  console.log('💡 Auth diagnostics available: window.authDiagnostics.print()');
}
