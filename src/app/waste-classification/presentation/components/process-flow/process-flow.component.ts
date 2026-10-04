import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ProcessState, PROCESS_STAGES, stageStatus } from '../../../domain/monitor.models';

@Component({
  selector: 'app-process-flow',
  imports: [IconComponent],
  templateUrl: './process-flow.component.html',
  styleUrl: './process-flow.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessFlowComponent {
  readonly process = input.required<ProcessState>();
  protected readonly stages = PROCESS_STAGES;
  protected readonly status = stageStatus;
}
