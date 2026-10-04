import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MetricCardComponent } from '../../../../shared/ui/metric-card/metric-card.component';
import { MonitorFacade } from '../../../application/monitor.facade';
import { CATEGORY_LABELS } from '../../../domain/monitor.models';
import { CameraFeedComponent } from '../../components/camera-feed/camera-feed.component';
import { DetectionDetailsComponent } from '../../components/detection-details/detection-details.component';
import { OperationTableComponent } from '../../components/operation-table/operation-table.component';
import { ProcessFlowComponent } from '../../components/process-flow/process-flow.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DecimalPipe,
    PercentPipe,
    MetricCardComponent,
    CameraFeedComponent,
    DetectionDetailsComponent,
    OperationTableComponent,
    ProcessFlowComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  protected readonly monitor = inject(MonitorFacade);
  protected readonly categories = CATEGORY_LABELS;
}
