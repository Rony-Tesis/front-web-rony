import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
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
  protected readonly pageSize = 10;
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.operations().length / this.pageSize)),
  );
  protected readonly currentPage = linkedSignal<number, number>({
    source: this.totalPages,
    computation: (totalPages, previous) => Math.min(previous?.value ?? 1, totalPages),
  });
  protected readonly firstRecord = computed(() =>
    this.operations().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0,
  );
  protected readonly lastRecord = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.operations().length),
  );
  protected readonly visibleOperations = computed(() =>
    this.compact()
      ? this.operations()
      : this.operations().slice(this.firstRecord() - 1, this.lastRecord()),
  );

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }
}
