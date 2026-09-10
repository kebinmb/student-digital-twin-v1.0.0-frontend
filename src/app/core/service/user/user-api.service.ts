import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserDetail, CreateUserRequest, UpdateUserRequest } from '../../models/user-management.model';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/users`;

  getUsers(): Observable<UserDetail[]> {
    return this.http.get<UserDetail[]>(this.baseUrl);
  }

  getUserById(id: number): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.baseUrl}/${id}`);
  }

  createUser(request: CreateUserRequest): Observable<UserDetail> {
    return this.http.post<UserDetail>(this.baseUrl, request);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<UserDetail> {
    return this.http.put<UserDetail>(`${this.baseUrl}/${id}`, request);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
