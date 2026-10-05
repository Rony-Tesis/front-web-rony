import { DecimalPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MonitorFacade } from '../../../application/monitor.facade';

@Component({
  selector: 'app-robot-controls',
  imports: [DecimalPipe, DatePipe],
  templateUrl: './robot-controls.component.html',
  styleUrl: './robot-controls.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RobotControlsComponent {
  protected readonly monitor = inject(MonitorFacade);
  protected readonly controlsVisible = signal(true);

  protected toggleControls(): void {
    this.controlsVisible.update((visible) => !visible);
  }
}
