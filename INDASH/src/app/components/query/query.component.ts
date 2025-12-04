import { Component } from '@angular/core';
import { SqlQueryService, QueryResponse } from '../../api/sql-query.service';
import { FormsModule } from '@angular/forms';
//import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-query',
  templateUrl: './query.component.html',
  styleUrls: ['./query.component.scss'],
  standalone: true,
  imports: [FormsModule],
})
export class QueryComponent {
  sqlQuery: string = '';
  results: any[] = [];
  error: string = '';
  isLoading: boolean = false;
  apiURL: string = '';

  constructor(private sqlQueryService: SqlQueryService) {}

  executeQuery(): void {
    if (!this.sqlQuery.trim()) {
      this.error = 'Please enter a SQL query';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.results = [];

    this.sqlQueryService.executeQuery(this.sqlQuery, this.apiURL).subscribe({
      next: (response: QueryResponse) => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.results = response.data;
        } else {
          this.error =
            response.error || response.message || 'Query execution failed';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error;
      },
    });
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
