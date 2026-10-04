import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEsPe);
bootstrapApplication(AppComponent, appConfig).catch(() => {
  console.error('No fue posible iniciar el monitor de clasificación.');
});
