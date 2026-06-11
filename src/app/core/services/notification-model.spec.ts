import { TestBed } from '@angular/core/testing';

import { NotificationModel } from './notification-model';

describe('NotificationModel', () => {
  let service: NotificationModel;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationModel);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
