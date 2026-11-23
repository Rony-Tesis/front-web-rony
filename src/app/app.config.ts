import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { sessionInterceptor } from './core/http/session.interceptor';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideWasteClassification } from './waste-classification/waste-classification.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(
      withInterceptors([sessionInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    ...provideWasteClassification(),
  ],
};
