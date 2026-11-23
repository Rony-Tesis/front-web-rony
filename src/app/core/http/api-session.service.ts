import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize, Subject, timeout } from 'rxjs';
import { apiEndpoint, RUNTIME_CONFIG } from '../config/runtime-config';

@Injectable({ providedIn: 'root' })
export class ApiSession {
  private readonly http = inject(HttpClient);
  private readonly config = inject(RUNTIME_CONFIG);
  readonly required = signal(false);
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly changes = new Subject<void>();

  signIn(token: string): void {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    this.http
      .post(
        apiEndpoint(this.config.apiBasePath, 'v1/session'),
        { token },
        {
          withCredentials: true,
          headers: { 'X-Rony-Control': '1' },
        },
      )
      .pipe(
        timeout(this.config.requestTimeoutMs),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: () => {
          this.required.set(false);
          this.changes.next();
        },
        error: (error: unknown) =>
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'La clave de acceso es incorrecta.'
              : 'No se pudo iniciar sesión. Revisa la conexión.',
          ),
      });
  }
}
