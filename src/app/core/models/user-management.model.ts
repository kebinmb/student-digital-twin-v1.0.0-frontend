export interface UserDetail {
  id: number;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  createdAt: string;
  collegeId?: number | null;
  collegeCode?: string | null;
  collegeName?: string | null;
  programId?: number | null;
  programCode?: string | null;
  programName?: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password?: string;
  roles: string[];
  enabled?: boolean;
  collegeId?: number | null;
  programId?: number | null;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  roles?: string[];
  enabled?: boolean;
  collegeId?: number | null;
  programId?: number | null;
  clearCollege?: boolean;
  clearProgram?: boolean;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  entityName: string;
  entityId?: string | number | null;
  details?: string | null;
  performedBy?: string | null;
  createdAt: string;
  ipAddress?: string | null;
}

