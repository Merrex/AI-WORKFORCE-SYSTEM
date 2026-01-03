# Deployment Guide

## Overview

This guide covers deploying the AI Workforce Platform for development, staging, and production environments.

## Development Environment

### Local Setup

1. **Prerequisites**
   ```bash
   # Install PostgreSQL
   brew install postgresql@15  # macOS
   sudo apt install postgresql  # Ubuntu

   # Install Redis
   brew install redis  # macOS
   sudo apt install redis  # Ubuntu

   # Start services
   brew services start postgresql  # macOS
   brew services start redis
   ```

2. **Setup Project**
   ```bash
   cd ai-workforce-platform
   npm run setup
   ```

3. **Configure Environment**
   ```bash
   # Edit .env and add your LLM API keys
   nano .env
   ```

4. **Initialize Database**
   ```bash
   createdb ai_workforce
   node scripts/run-migrations.js
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Testing Strategy

### 1. Unit Tests (No LLM Required)

Run unit tests with mocked LLM providers:

```bash
npm run test:unit
```

These tests use `MockLLMProvider` and don't require real API keys.

### 2. Integration Tests (LLM Optional)

For integration tests without LLM:

```bash
NODE_ENV=test npm run test:integration
```

For integration tests WITH real LLM:

```bash
# Set your API keys
export OPENAI_API_KEY=sk-your-key
npm run test:integration
```

### 3. Local Testing Without API Keys

```bash
# Use mock mode
export USE_MOCK_LLM=true
npm run dev:backend
```

In your code:
```typescript
const provider = process.env.USE_MOCK_LLM === 'true'
  ? new MockLLMProvider(config)
  : createLLMProvider(config);
```

### 4. Manual API Testing

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login and get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  | jq -r '.token')

# Create an agent
curl -X POST http://localhost:5000/api/admin/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"ceo","name":"CEO Assistant","authorityLevel":"high"}'
```

## Production Deployment

### 1. Environment Configuration

Create production `.env`:

```bash
NODE_ENV=production
APP_PORT=3000
API_PORT=5000

# Use strong, unique values
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Production database
DATABASE_URL=postgresql://user:password@prod-db:5432/ai_workforce

# Redis
REDIS_URL=redis://prod-redis:6379

# Your LLM keys
OPENAI_API_KEY=sk-prod-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key

# Security
CORS_ORIGIN=https://your-domain.com
```

### 2. Database Setup

```bash
# Run migrations on production DB
DATABASE_URL=your-prod-url node scripts/run-migrations.js
```

### 3. Build for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 4. Deploy to Cloud

#### AWS Deployment

```bash
# Using AWS ECS/Fargate
aws ecs create-cluster --cluster-name ai-workforce

# Push Docker images
docker build -t ai-workforce-backend ./backend
docker tag ai-workforce-backend:latest $ECR_URL/backend:latest
docker push $ECR_URL/backend:latest
```

#### Kubernetes Deployment

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:5000/health

# Database connection
psql $DATABASE_URL -c "SELECT 1"

# Redis connection
redis-cli ping
```

### Logs

```bash
# View backend logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# With Docker
docker-compose logs -f backend
```

## Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Input validation enabled
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Security headers configured (helmet.js)

## Scaling Considerations

### Horizontal Scaling

- Run multiple backend instances behind load balancer
- Use Redis for session storage (already configured)
- Use external vector database (Qdrant cluster)

### Database Scaling

- Set up read replicas for queries
- Implement connection pooling (already configured)
- Consider partitioning for large datasets

### Caching Strategy

- Redis for API responses
- Vector DB for semantic search
- CDN for frontend assets

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated daily backup
0 2 * * * pg_dump $DATABASE_URL > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Vector Database Backups

```bash
# Backup Qdrant data
curl http://localhost:6333/collections/ai_workforce_memory/snapshots
```

## Rollback Procedure

1. Stop new deployments
2. Revert to previous Docker image/commit
3. Rollback database migrations if needed
4. Monitor error rates

## Performance Optimization

### Backend

- Enable response compression
- Implement request caching
- Use database query optimization
- Batch LLM requests when possible

### Frontend

- Code splitting
- Lazy loading
- Asset optimization
- Service worker for offline support

## Troubleshooting

### High Memory Usage

```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/index.js
```

### Slow Database Queries

```bash
# Enable query logging
psql $DATABASE_URL -c "ALTER DATABASE ai_workforce SET log_statement = 'all';"
```

### LLM API Rate Limits

- Implement exponential backoff
- Use request queuing
- Cache responses when appropriate
- Monitor usage quotas

## Cost Optimization

1. **LLM Costs**
   - Use appropriate model sizes
   - Cache common queries
   - Implement request deduplication

2. **Infrastructure**
   - Auto-scaling policies
   - Spot instances for non-critical workloads
   - Reserved instances for baseline capacity

3. **Database**
   - Regular vacuum and analyze
   - Archive old data
   - Optimize indexes
