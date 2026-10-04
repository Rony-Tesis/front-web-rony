import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-metric-card',
  imports: [IconComponent],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly detail = input('');
  readonly icon = input<IconName>('bars');
  readonly tone = input<'default' | 'success' | 'danger' | 'blue'>('default');
  readonly summary = input(false);
}
