import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { ApiSession } from './api-session.service';

export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(ApiSession);
  return next(request).pipe(
    tap({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) session.required.set(true);
      },
    }),
  );
};
