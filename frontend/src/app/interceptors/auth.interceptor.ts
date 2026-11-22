import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const isApiCall = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api');
  const authReq =
    token && isApiCall
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && isApiCall && !req.url.includes('/api/login')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
