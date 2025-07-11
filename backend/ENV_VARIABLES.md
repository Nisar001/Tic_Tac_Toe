# Environment Variables Documentation

## Overview
This document describes all environment variables used in the Tic Tac Toe API backend.

## Required Variables

### Core Configuration
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development`, `staging`, `production` | ✅ |
| `PORT` | Server port | `5000` | ✅ |
| `HOST` | Server host | `localhost` | ❌ |

### Database
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/tic_tac_toe` | ✅ |

### Authentication & Security
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret for JWT signing | `your-super-secret-key` | ✅ |
| `JWT_REFRESH_SECRET` | Secret for refresh token | `your-refresh-secret` | ✅ |
| `JWT_EXPIRES_IN` | JWT expiration time | `15m` | ❌ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` | ❌ |
| `SESSION_SECRET` | Session secret | `your-session-secret` | ❌ |
| `ADMIN_API_KEY` | Admin API key | `admin-api-key` | ❌ |

## Optional Variables

### Email Configuration (for notifications)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` | ❌ |
| `EMAIL_PORT` | SMTP port | `587` | ❌ |
| `EMAIL_USER` | Email username | `your-email@gmail.com` | ❌ |
| `EMAIL_PASS` | Email password/app password | `your-app-password` | ❌ |

### SMS Configuration (Twilio)
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxxxxxxx` | ❌ |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your-auth-token` | ❌ |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` | ❌ |

### Social Authentication
| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-google-client-id` | ❌ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your-google-secret` | ❌ |
| `FACEBOOK_APP_ID` | Facebook App ID | `your-facebook-app-id` | ❌ |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | `your-facebook-secret` | ❌ |

### Performance & Security
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | ❌ |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` | ❌ |

### Logging & Monitoring
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `LOG_FILE` | Log file path | `logs/app.log` | ❌ |

### Feature Flags
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENABLE_SWAGGER` | Enable API documentation | `true` | ❌ |
| `ENABLE_METRICS` | Enable metrics endpoint | `true` | ❌ |
| `ENABLE_HEALTH_CHECK` | Enable health check | `true` | ❌ |

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tic_tac_toe_dev
LOG_LEVEL=debug
ENABLE_SWAGGER=true
```

### Staging
```env
NODE_ENV=staging
PORT=5000
MONGODB_URI=mongodb://staging-host:27017/tic_tac_toe_staging
LOG_LEVEL=info
ENABLE_SWAGGER=true
```

### Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://prod-cluster:27017/tic_tac_toe_prod
LOG_LEVEL=warn
ENABLE_SWAGGER=false
```

## Security Best Practices

### 🔒 Secret Management
- Never commit actual secrets to version control
- Use strong, unique secrets for each environment
- Rotate secrets regularly
- Use environment-specific secrets

### 🛡️ JWT Configuration
- Use long, random JWT secrets (minimum 256 bits)
- Set appropriate expiration times
- Use different secrets for access and refresh tokens

### 📧 Third-Party Services
- Use app-specific passwords for email
- Restrict API keys to necessary permissions only
- Monitor usage of third-party services

## Setup Instructions

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Update Required Variables
Edit `.env` and set at minimum:
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

### 3. Configure Optional Services
Set up additional services as needed:
- Email configuration for notifications
- Twilio for SMS features
- Social authentication providers

### 4. Verify Configuration
Start the server and check:
```bash
npm run dev
```

Visit `http://localhost:5000/health` to verify the configuration.

## Troubleshooting

### Common Issues

#### Missing Required Variables
```
Error: Configuration validation failed: missing NODE_ENV
```
**Solution**: Ensure all required variables are set in `.env`

#### Database Connection Failed
```
Error: MongoNetworkError: failed to connect to server
```
**Solution**: Check `MONGODB_URI` and ensure MongoDB is running

#### JWT Token Issues
```
Error: JsonWebTokenError: invalid signature
```
**Solution**: Verify `JWT_SECRET` is correctly set and consistent

### Environment Validation
The application validates environment variables on startup. Check the console output for any missing or invalid configurations.

## Related Files
- `.env` - Actual environment variables (never commit)
- `.env.example` - Template with example values
- `src/config/index.ts` - Configuration validation and parsing
- `src/config/database.ts` - Database configuration
