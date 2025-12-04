import { TestBed } from '@angular/core/testing';

import { CurrentId } from './current-id';

describe('CurrentId', () => {
  let service: CurrentId;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentId);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
