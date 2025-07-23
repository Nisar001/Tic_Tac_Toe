export interface JWTPayload {
  userId: string;
  email?: string;
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}