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
}
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  invalidParams?: Record<string, string>;
}