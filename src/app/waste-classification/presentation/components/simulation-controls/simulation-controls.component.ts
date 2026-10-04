import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MonitorFacade } from '../../../application/monitor.facade';

@Component({
  selector: 'app-simulation-controls',
  templateUrl: './simulation-controls.component.html',
  styleUrl: './simulation-controls.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationControlsComponent {
  protected readonly monitor = inject(MonitorFacade);
}
