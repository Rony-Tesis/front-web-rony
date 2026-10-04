import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { MetricCardComponent } from '../../../../shared/ui/metric-card/metric-card.component';
import { MonitorFacade } from '../../../application/monitor.facade';
import { percentage } from '../../../domain/monitor.models';
import { OperationTableComponent } from '../../components/operation-table/operation-table.component';
import { SystemHealthComponent } from '../../components/system-health/system-health.component';

@Component({
  selector: 'app-classifications-page',
  imports: [
    DecimalPipe,
    IconComponent,
    MetricCardComponent,
    OperationTableComponent,
    SystemHealthComponent,
  ],
  templateUrl: './classifications-page.component.html',
  styleUrl: './classifications-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassificationsPageComponent {
  protected readonly monitor = inject(MonitorFacade);
  protected readonly percentage = percentage;
}
