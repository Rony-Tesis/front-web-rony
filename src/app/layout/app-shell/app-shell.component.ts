import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MonitorFacade } from '../../waste-classification/application/monitor.facade';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { FormsModule } from '@angular/forms';
import { ApiSession } from '../../core/http/api-session.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, FormsModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  protected readonly monitor = inject(MonitorFacade);
  protected readonly session = inject(ApiSession);
  protected accessKey = '';
  protected signIn(): void {
    this.session.signIn(this.accessKey);
    this.accessKey = '';
  }
}
