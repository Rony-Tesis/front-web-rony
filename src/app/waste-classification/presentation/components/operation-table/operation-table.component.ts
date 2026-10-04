import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CATEGORY_LABELS, ClassificationOperation } from '../../../domain/monitor.models';

@Component({
  selector: 'app-operation-table',
  imports: [DatePipe, DecimalPipe, PercentPipe],
  templateUrl: './operation-table.component.html',
  styleUrl: './operation-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationTableComponent {
  readonly operations = input.required<readonly ClassificationOperation[]>();
  readonly compact = input(false);
  protected readonly categories = CATEGORY_LABELS;
}
