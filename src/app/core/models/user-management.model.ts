export interface UserDetail {
  id: number;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password?: string;
  roles: string[];
  enabled?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  roles?: string[];
  enabled?: boolean;
}
