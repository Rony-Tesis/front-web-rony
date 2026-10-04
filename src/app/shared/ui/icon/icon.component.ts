import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'home'
  | 'camera'
  | 'db'
  | 'settings'
  | 'clock'
  | 'robot'
  | 'recycle'
  | 'map'
  | 'arrow'
  | 'check'
  | 'gripper'
  | 'cpu'
  | 'bars'
  | 'doc';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
