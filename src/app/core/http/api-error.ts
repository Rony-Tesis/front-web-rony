import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError)
    return 'La API no respondió a tiempo. Se intentará nuevamente.';
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'La sesión no está autenticada. Inicia sesión en el sistema.';
    if (error.status === 403) return 'No tienes permiso para consultar el monitoreo.';
    if (error.status === 0) return 'No hay conexión con la API. Se intentará nuevamente.';
    if (error.status === 429) return 'La API limitó las consultas. Se reintentará más adelante.';
    return 'No fue posible consultar la API. Se intentará nuevamente.';
  }
  return 'La respuesta de la API no cumple el contrato esperado.';
}
