import { TestBed } from '@angular/core/testing';

import { PatientServiceTs } from './patient.service.ts';

describe('PatientServiceTs', () => {
  let service: PatientServiceTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatientServiceTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
