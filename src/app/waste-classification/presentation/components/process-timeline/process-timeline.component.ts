import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { MonitorSnapshot, PROCESS_STAGES, stageStatus } from '../../../domain/monitor.models';

@Component({
  selector: 'app-process-timeline',
  imports: [DecimalPipe, IconComponent],
  templateUrl: './process-timeline.component.html',
  styleUrl: './process-timeline.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessTimelineComponent {
  readonly snapshot = input.required<MonitorSnapshot>();
  readonly stateLabel = input.required<string>();
  protected readonly target = computed(() =>
    this.snapshot().targetDetection === undefined
      ? this.snapshot().detection
      : this.snapshot().targetDetection,
  );
  protected readonly stages = PROCESS_STAGES;
  protected readonly status = stageStatus;
}
