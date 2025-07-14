import { body, ValidationChain } from 'express-validator';

export const validateResendVerification: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];
