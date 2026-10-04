import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CATEGORY_LABELS, Detection } from '../../../domain/monitor.models';

@Component({
  selector: 'app-detection-details',
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './detection-details.component.html',
  styleUrl: './detection-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetectionDetailsComponent {
  readonly detection = input.required<Detection | null>();
  readonly selection = input(false);
  readonly experimentalMode = input<'optimized' | 'baseline'>('optimized');
  protected readonly categories = CATEGORY_LABELS;
}
