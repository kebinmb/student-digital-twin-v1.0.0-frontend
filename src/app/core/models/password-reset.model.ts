export interface ForgotPasswordRequest{
    email:string;
}

export interface ResetPasswordRequest{
    token:string;
    newPassword:string;
}

export interface PasswordResetState{
    loading:boolean;
    successMessage: string | null;
    errorMessage: string | null;
}