import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Necessario para formatDate(..., 'pt-BR') em app.component.ts (serializeDate) -
// sem isso, o Angular lanca NG0701 (locale nao registrado) ao enviar datas.
registerLocaleData(localePt, 'pt-BR');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
