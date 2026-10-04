import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import {
  EQUIPMENT_LABELS,
  EquipmentId,
  EquipmentStatus,
  MonitorSnapshot,
} from '../../../domain/monitor.models';

@Component({
  selector: 'app-system-health',
  imports: [DatePipe, IconComponent],
  templateUrl: './system-health.component.html',
  styleUrl: './system-health.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemHealthComponent {
  readonly snapshot = input.required<MonitorSnapshot>();
  readonly expanded = input(false);
  readonly simulation = input(false);
  protected readonly labels = EQUIPMENT_LABELS;
  protected readonly icons: Record<EquipmentId, IconName> = {
    camera: 'camera',
    yolo: 'cpu',
    robot: 'robot',
    gripper: 'gripper',
    planner: 'settings',
  };
  protected readonly equipment = computed(() =>
    this.expanded()
      ? this.snapshot().equipment.filter((item) => ['camera', 'yolo', 'gripper'].includes(item.id))
      : this.snapshot().equipment,
  );
  protected label(id: EquipmentId, status: EquipmentStatus): string {
    if (status === 'offline') return 'Sin conexión';
    if (status === 'unknown') return 'Desconocido';
    if (id === 'gripper' && this.expanded())
      return this.snapshot().process.gripperClosed ? 'Cerrada' : 'Abierta';
    return id === 'camera' ? 'Conectada' : 'Activo';
  }
}
