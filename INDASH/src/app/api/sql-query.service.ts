// sql-query.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface QueryResponse {
  status: string;
  data: any[];
  count?: number;
  message?: string;
  error?: string;
  q?: number;
}

export type ApiSource = 'siaptanam' | 'scs1' | 'sifortuna';

@Injectable({
  providedIn: 'root',
})
export class SqlQueryService {
  private defaultApiUrl = environment.apiUrls.siaptanam;
  private apiUrls = environment.apiUrls;

  constructor(private http: HttpClient) {}

  executeQuery(sqlQuery: string, apiUrl?: string): Observable<QueryResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const body = {
      query: sqlQuery,
    };

    const url = apiUrl || this.defaultApiUrl;

    return this.http
      .post<QueryResponse>(url, body, { headers })
      .pipe(catchError(this.handleError));
  }

  /**
   * Execute query on SIAPTANAM database (KATAM data)
   */
  executeSiaptanamQuery(sqlQuery: string): Observable<QueryResponse> {
    return this.executeQuery(sqlQuery, this.apiUrls.siaptanam);
  }

  /**
   * Execute query on SCS1 database (SISCROP data)
   */
  executeScs1Query(sqlQuery: string): Observable<QueryResponse> {
    return this.executeQuery(sqlQuery, this.apiUrls.scs1);
  }

  /**
   * Execute query on SiFortuna database
   */
  executeSiFOrtunaQuery(sqlQuery: string): Observable<QueryResponse> {
    return this.executeQuery(sqlQuery, this.apiUrls.sifortuna);
  }

  /**
   * Execute query with explicit API source selection
   */
  executeQueryBySource(sqlQuery: string, source: ApiSource): Observable<QueryResponse> {
    const url = this.apiUrls[source];
    return this.executeQuery(sqlQuery, url);
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';

    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    return throwError(() => errorMessage);
  }
}
