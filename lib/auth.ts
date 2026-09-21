// Legacy auth.ts — replaced by Firebase auth
export { getCurrentUser, verifySession } from './auth-firebase';

// Alias getSession → getCurrentUser for backward compatibility
export { getCurrentUser as getSession } from './auth-firebase';

export interface UserPayload {
  id: string;
  nom: string;
  email: string;
  role: string;
}
