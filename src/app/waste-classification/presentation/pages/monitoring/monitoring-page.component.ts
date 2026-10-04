import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { MonitorFacade } from '../../../application/monitor.facade';
import { CameraFeedComponent } from '../../components/camera-feed/camera-feed.component';
import { DetectionDetailsComponent } from '../../components/detection-details/detection-details.component';
import { ProcessTimelineComponent } from '../../components/process-timeline/process-timeline.component';
import { SimulationControlsComponent } from '../../components/simulation-controls/simulation-controls.component';
import { SystemHealthComponent } from '../../components/system-health/system-health.component';

@Component({
  selector: 'app-monitoring-page',
  imports: [
    IconComponent,
    CameraFeedComponent,
    DetectionDetailsComponent,
    ProcessTimelineComponent,
    SystemHealthComponent,
    SimulationControlsComponent,
  ],
  templateUrl: './monitoring-page.component.html',
  styleUrl: './monitoring-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoringPageComponent {
  protected readonly monitor = inject(MonitorFacade);
}
