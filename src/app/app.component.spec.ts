import { registerLocaleData } from '@angular/common';
import esPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { RUNTIME_CONFIG } from './core/config/runtime-config';
import { MONITOR_REPOSITORY } from './waste-classification/application/monitor-repository';
import { SimulationEngine } from './waste-classification/domain/simulation-engine';

describe('Monitor navigation and templates', () => {
  beforeEach(() => {
    registerLocaleData(esPe);
    const seed = new SimulationEngine(Date.now()).snapshot(Date.now());
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        { provide: RUNTIME_CONFIG, useValue: { dataSource: 'simulation', apiBasePath: '/api' } },
        {
          provide: MONITOR_REPOSITORY,
          useValue: {
            watch: () => of({ snapshot: seed, error: null }),
            setSimulationPaused: vi.fn(),
          },
        },
      ],
    });
  });

  it('navigates all original views and maintains one active navigation link', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    for (const [path, title] of [
      ['/dashboard', 'Panel principal'],
      ['/monitoring', 'Monitoreo'],
      ['/classifications', 'Clasificaciones'],
    ]) {
      await router.navigateByUrl(path!);
      await fixture.whenStable();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('h1')?.textContent).toBe(title);
      expect(element.querySelectorAll('nav a[aria-current="page"]')).toHaveLength(1);
    }
    fixture.destroy();
  });

  it('renders API text through Angular escaping instead of interpreting HTML', async () => {
    TestBed.resetTestingModule();
    const snapshot = new SimulationEngine(Date.now()).snapshot(Date.now());
    const unsafeName = '<img src=x onerror=alert(1)>';
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        { provide: RUNTIME_CONFIG, useValue: { dataSource: 'simulation', apiBasePath: '/api' } },
        {
          provide: MONITOR_REPOSITORY,
          useValue: {
            watch: () =>
              of({
                snapshot: {
                  ...snapshot,
                  detection: { ...snapshot.detection, residue: unsafeName },
                },
                error: null,
              }),
            setSimulationPaused: vi.fn(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-detection-details')?.textContent).toContain(unsafeName);
    expect(element.querySelector('img[onerror]')).toBeNull();
    fixture.destroy();
  });
});
