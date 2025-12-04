import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CurrentIdService {
  private currentIdSubject = new BehaviorSubject<string>('');
  currentId$ = this.currentIdSubject.asObservable();

  setCurrentId(value: string) {
    this.currentIdSubject.next(value);
  }

  getCurrentId(): string {
    return this.currentIdSubject.value;
  }
}
