import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

export type PanelMode = 'side' | 'bottom-sheet';
export type BottomSheetState = 'collapsed' | 'half' | 'full';

@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
  standalone: true,
  imports: [IonIcon, CommonModule],
})
export class SidePanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('panelElement') panelElement!: ElementRef<HTMLDivElement>;

  @Input() position: 'left' | 'right' | 'bottom' = 'left';
  @Input() panelWidth: string = '300px';
  @Input() panelHeight: string = '100%';
  @Input() backgroundColor: string = 'rgba(255, 255, 255, 0.6)';
  @Input() overlayOpacity: number = 1;
  @Input() transitionSpeed: string = '0.3s ease';
  @Input() isEnabled: boolean = true;
  @Input() isCollapsed: boolean = false;

  // Bottom sheet specific inputs
  @Input() mode: PanelMode = 'side';
  @Input() bottomSheetState: BottomSheetState = 'half';
  @Input() collapsedHeight: string = '60px';  // Height when collapsed (tab bar visible)
  @Input() halfHeight: string = '50vh';       // Height when half expanded
  @Input() fullHeight: string = '85vh';       // Height when fully expanded

  @Output() isEnabledChange = new EventEmitter<boolean>();
  @Output() isCollapsedChange = new EventEmitter<boolean>();
  @Output() bottomSheetStateChange = new EventEmitter<BottomSheetState>();

  // Drag state
  private isDragging = false;
  private startY = 0;
  private startHeight = 0;
  private currentHeight = 0;
  private dragStartTime = 0;
  private hasMoved = false;

  // Bound event handlers for cleanup
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor() {
    addIcons({
      'chevron-forward-outline': chevronForwardOutline
    });
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
  }

  ngAfterViewInit(): void {
    if (this.mode === 'bottom-sheet') {
      this.setBottomSheetHeight(this.bottomSheetState);
    }
  }

  ngOnDestroy(): void {
    this.removeGlobalListeners();
  }

  togglePanel(): void {
    if (!this.isEnabled) return;

    if (this.mode === 'bottom-sheet') {
      // Cycle through states: collapsed -> half -> full -> collapsed
      if (this.bottomSheetState === 'collapsed') {
        this.setBottomSheetState('half');
      } else if (this.bottomSheetState === 'half') {
        this.setBottomSheetState('full');
      } else {
        this.setBottomSheetState('collapsed');
      }
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.isCollapsedChange.emit(this.isCollapsed);
    }
  }

  @Input()
  set disabled(value: boolean) {
    this.isEnabled = !value;
    this.isEnabledChange.emit(this.isEnabled);
    if (!this.isEnabled) {
      this.isCollapsed = true;
    }
  }

  get disabled(): boolean {
    return !this.isEnabled;
  }

  // Bottom sheet methods
  setBottomSheetState(state: BottomSheetState): void {
    this.bottomSheetState = state;
    this.bottomSheetStateChange.emit(state);
    this.setBottomSheetHeight(state);
  }

  private setBottomSheetHeight(state: BottomSheetState): void {
    if (!this.panelElement?.nativeElement) return;

    const panel = this.panelElement.nativeElement;
    panel.style.transition = this.transitionSpeed;

    switch (state) {
      case 'collapsed':
        panel.style.height = this.collapsedHeight;
        break;
      case 'half':
        panel.style.height = this.halfHeight;
        break;
      case 'full':
        panel.style.height = this.fullHeight;
        break;
    }
  }

  getBottomSheetHeight(): string {
    switch (this.bottomSheetState) {
      case 'collapsed':
        return this.collapsedHeight;
      case 'half':
        return this.halfHeight;
      case 'full':
        return this.fullHeight;
      default:
        return this.halfHeight;
    }
  }

  // Drag handle methods
  onDragHandleTouchStart(event: TouchEvent): void {
    if (this.mode !== 'bottom-sheet') return;
    event.preventDefault();
    this.startDrag(event.touches[0].clientY);
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd);
  }

  onDragHandleMouseDown(event: MouseEvent): void {
    if (this.mode !== 'bottom-sheet') return;
    event.preventDefault();
    this.startDrag(event.clientY);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  // Click handler as fallback for tap
  onDragHandleClick(event: MouseEvent): void {
    if (this.mode !== 'bottom-sheet') return;
    // Only toggle if we didn't drag (hasMoved will be true if we dragged)
    if (!this.hasMoved) {
      this.togglePanel();
    }
    // Reset hasMoved for next interaction
    this.hasMoved = false;
  }

  private startDrag(clientY: number): void {
    this.isDragging = true;
    this.startY = clientY;
    this.dragStartTime = Date.now();
    this.hasMoved = false;
    if (this.panelElement?.nativeElement) {
      this.startHeight = this.panelElement.nativeElement.offsetHeight;
      this.currentHeight = this.startHeight;
      this.panelElement.nativeElement.style.transition = 'none';
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.handleDrag(event.touches[0].clientY);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.handleDrag(event.clientY);
  }

  private handleDrag(clientY: number): void {
    const deltaY = this.startY - clientY;

    // Mark as moved if dragged more than 5px threshold
    if (Math.abs(deltaY) > 5) {
      this.hasMoved = true;
    }

    this.currentHeight = Math.max(60, Math.min(window.innerHeight * 0.9, this.startHeight + deltaY));

    if (this.panelElement?.nativeElement) {
      this.panelElement.nativeElement.style.height = `${this.currentHeight}px`;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    this.endDrag();
    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);
  }

  private onMouseUp(event: MouseEvent): void {
    this.endDrag();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const dragDuration = Date.now() - this.dragStartTime;

    // If it was a quick tap (< 200ms) and didn't move, treat as click to toggle
    if (dragDuration < 200 && !this.hasMoved) {
      this.togglePanel();
      return;
    }

    // If user didn't move significantly, don't change state
    if (!this.hasMoved) {
      this.setBottomSheetHeight(this.bottomSheetState);
      return;
    }

    // Snap to nearest state based on current height
    const windowHeight = window.innerHeight;
    const heightPercent = (this.currentHeight / windowHeight) * 100;

    if (heightPercent < 20) {
      this.setBottomSheetState('collapsed');
    } else if (heightPercent < 65) {
      this.setBottomSheetState('half');
    } else {
      this.setBottomSheetState('full');
    }
  }

  private removeGlobalListeners(): void {
    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }
}
