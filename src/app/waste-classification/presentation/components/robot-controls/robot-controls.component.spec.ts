import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MonitorFacade } from '../../../application/monitor.facade';
import { SimulationEngine } from '../../../domain/simulation-engine';
import { RobotControlsComponent } from './robot-controls.component';

describe('Manual robot controls', () => {
  it('keeps both buttons inside the eye panel and dispatches the fixed controls', async () => {
    const seed = new SimulationEngine(Date.now()).snapshot(Date.now());
    const enabled = signal(true);
    const monitor = {
      snapshot: signal(seed),
      isSimulation: false,
      error: signal(null),
      controlError: signal(null),
      canArmRobot: signal(false),
      canResetRobot: signal(false),
      canCancelRobot: signal(false),
      canUseManualControls: enabled,
      canParkRobot: enabled,
      closeGripper: vi.fn(),
      parkRobot: vi.fn(),
      armRobot: vi.fn(),
      resetRobot: vi.fn(),
      cancelRobot: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [RobotControlsComponent],
      providers: [{ provide: MonitorFacade, useValue: monitor }],
    }).compileComponents();
    const fixture = TestBed.createComponent(RobotControlsComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const close = root.querySelector<HTMLButtonElement>('.manual-close')!;
    const park = root.querySelector<HTMLButtonElement>('.manual-park')!;
    expect(close.closest('#jetmax-controls')).not.toBeNull();
    expect(park.closest('#jetmax-controls')).not.toBeNull();
    close.click();
    park.click();
    expect(monitor.closeGripper).toHaveBeenCalledOnce();
    expect(monitor.parkRobot).toHaveBeenCalledOnce();
    enabled.set(false);
    fixture.detectChanges();
    expect(close.disabled).toBe(true);
    expect(park.disabled).toBe(true);
    root.querySelector<HTMLButtonElement>('.visibility-toggle')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.manual-controls')).toBeNull();
    root.querySelector<HTMLButtonElement>('.visibility-toggle')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.manual-controls')).not.toBeNull();
  });
});
