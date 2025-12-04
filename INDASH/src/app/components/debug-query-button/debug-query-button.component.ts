import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { environment } from 'src/environments/environment';

export interface QueryMetadata {
  query: string;
  database: string;
  table?: string;
  description?: string;
}

@Component({
  selector: 'app-debug-query-button',
  template: `
    @if (environment.showDebugTools) {
      <ion-button
        size="small"
        fill="clear"
        (click)="copyQuery()"
        class="debug-btn"
        title="Copy query to clipboard">
        <ion-icon name="code-slash" slot="icon-only"></ion-icon>
      </ion-button>
    }
  `,
  styles: [`
    .debug-btn {
      --padding-start: 4px;
      --padding-end: 4px;
      font-size: 14px;
      opacity: 0.6;
    }
    .debug-btn:hover {
      opacity: 1;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon]
})
export class DebugQueryButtonComponent {
  @Input() metadata!: QueryMetadata;
  environment = environment;

  copyQuery(): void {
    console.log('[DEBUG BUTTON] Button clicked');
    console.log('[DEBUG BUTTON] Metadata:', this.metadata);

    if (!this.metadata) {
      alert('ERROR: No metadata available!');
      console.error('[DEBUG BUTTON] No metadata!');
      return;
    }

    const text = this.formatQueryInfo();
    console.log('[DEBUG BUTTON] Formatted text to copy:', text);

    // Use native Clipboard API (no dependencies needed)
    navigator.clipboard.writeText(text).then(
      () => {
        console.log('[DEBUG BUTTON] ✓ Query copied to clipboard successfully!');
        console.log('[DEBUG BUTTON] Text:', text);
        alert('✓ Query copied to clipboard!\n\nCheck console for details or paste to see.');
      },
      (err) => {
        console.error('[DEBUG BUTTON] ✗ Failed to copy query:', err);
        console.log('[DEBUG BUTTON] Query (manual copy):\n', text);
        alert('✗ Failed to copy to clipboard!\n\nCheck browser console for the query.');
      }
    );
  }

  private formatQueryInfo(): string {
    const lines: string[] = [];

    if (this.metadata.description) {
      lines.push(`Description: ${this.metadata.description}`);
    }
    lines.push(`Query: ${this.metadata.query}`);
    lines.push(`Database: ${this.metadata.database}`);
    if (this.metadata.table) {
      lines.push(`Table: ${this.metadata.table}`);
    }

    return lines.join('\n');
  }
}
