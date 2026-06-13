import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  const allowedRoles = route.data?.['roles'] as string[];

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const currentUser = authService.currentUserValue;

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  if (allowedRoles.includes(currentUser.role)) {
    return true;
  }

  router.navigate(['/access-denied']);
  return false;
};