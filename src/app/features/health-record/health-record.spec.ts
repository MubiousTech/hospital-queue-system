import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthRecord } from './health-record';

describe('HealthRecord', () => {
  let component: HealthRecord;
  let fixture: ComponentFixture<HealthRecord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthRecord],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthRecord);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
