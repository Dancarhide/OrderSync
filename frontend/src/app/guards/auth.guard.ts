import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that prevents unauthenticated users from accessing protected pages (e.g. Dashboard, Settings).
 * If no valid session token exists, redirects immediately to /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirect to login if user is not authenticated
  router.navigate(['/login']);
  return false;
};

/**
 * Route guard that prevents already authenticated users from visiting the login page.
 * If already logged in, redirects directly to /dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
