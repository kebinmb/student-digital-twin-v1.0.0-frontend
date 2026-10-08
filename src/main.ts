import './polyfills';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { applyPrimeNGToastPatch } from './app/core/patches/primeng-toast.patch';

// Apply patch to prevent PrimeNG Toast NG0318 style binding runtime warning
applyPrimeNGToastPatch();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
