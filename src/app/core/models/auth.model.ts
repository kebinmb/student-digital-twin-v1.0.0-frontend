export interface LoginRequest{
    usernameOrEmail:string;
    password:string;

}

export interface RegisterRequest{
    username:string;
    email:string;
    password:string;
}

export interface AuthResponse{
    accessToken:string;
    tokenType:string;
    expiresInSeconds:number;
    refreshToken?: string;
}
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  invalidParams?: Record<string, string>;
}

export interface UserContext {
  id: number | null;
  username: string;
  email: string;
  role: string;
  roles: string[];
  collegeId?: number | null;
  programId?: number | null;
  studentProfileId?: number | null;
  studentId?: number | null;
  studentNumber?: string | null;
}