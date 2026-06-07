import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QueueManagement } from './queue-management';

describe('QueueManagement', () => {
  let component: QueueManagement;
  let fixture: ComponentFixture<QueueManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(QueueManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
