import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QrUploaderService {

  constructor(private http: HttpClient) {}

  sendToAPI(data: any): Observable<any> {
    return this.http.post('http://localhost:9002/api/Payment/ttb/webhook', data);
  }
}
