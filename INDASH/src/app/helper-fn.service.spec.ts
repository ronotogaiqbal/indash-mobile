import { TestBed } from '@angular/core/testing';

import { HelperFnService } from './helper-fn.service';

describe('HelperFnService', () => {
  let service: HelperFnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HelperFnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
