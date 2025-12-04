import { Injectable, OnDestroy } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

@Injectable({
  providedIn: 'root'
})
export class ScreenService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // Mobile: < 768px
  // Tablet: 768px - 992px
  // Desktop: > 992px
  private readonly MOBILE_BREAKPOINT = '(max-width: 767px)';
  private readonly TABLET_BREAKPOINT = '(min-width: 768px) and (max-width: 991px)';
  private readonly DESKTOP_BREAKPOINT = '(min-width: 992px)';

  private _isMobile$ = new BehaviorSubject<boolean>(false);
  private _isTablet$ = new BehaviorSubject<boolean>(false);
  private _isDesktop$ = new BehaviorSubject<boolean>(true);
  private _screenSize$ = new BehaviorSubject<ScreenSize>('desktop');

  // Public observables
  readonly isMobile$: Observable<boolean> = this._isMobile$.asObservable();
  readonly isTablet$: Observable<boolean> = this._isTablet$.asObservable();
  readonly isDesktop$: Observable<boolean> = this._isDesktop$.asObservable();
  readonly screenSize$: Observable<ScreenSize> = this._screenSize$.asObservable();

  constructor(private breakpointObserver: BreakpointObserver) {
    this.initBreakpointObserver();
  }

  private initBreakpointObserver(): void {
    // Observe mobile breakpoint
    this.breakpointObserver
      .observe([this.MOBILE_BREAKPOINT])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this._isMobile$.next(result.matches);
        if (result.matches) {
          this._screenSize$.next('mobile');
        }
      });

    // Observe tablet breakpoint
    this.breakpointObserver
      .observe([this.TABLET_BREAKPOINT])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this._isTablet$.next(result.matches);
        if (result.matches) {
          this._screenSize$.next('tablet');
        }
      });

    // Observe desktop breakpoint
    this.breakpointObserver
      .observe([this.DESKTOP_BREAKPOINT])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this._isDesktop$.next(result.matches);
        if (result.matches) {
          this._screenSize$.next('desktop');
        }
      });
  }

  // Synchronous getters for current state
  get isMobile(): boolean {
    return this._isMobile$.value;
  }

  get isTablet(): boolean {
    return this._isTablet$.value;
  }

  get isDesktop(): boolean {
    return this._isDesktop$.value;
  }

  get screenSize(): ScreenSize {
    return this._screenSize$.value;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
