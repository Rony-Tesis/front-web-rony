import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';
import { MonitorFacade } from '../../waste-classification/application/monitor.facade';

@Component({
  selector: 'app-topbar',
  imports: [DatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  protected readonly monitor = inject(MonitorFacade);
  protected readonly now = toSignal(timer(0, 1000).pipe(map(() => new Date())), {
    initialValue: new Date(),
  });
}
