# Quick Start Guide

Get the AI Workforce Platform running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- An LLM API key (OpenAI, Anthropic, or Cohere)

## Setup Steps

### 1. Install Dependencies

```bash
cd ai-workforce-platform
npm run setup
```

This installs all packages and creates a `.env` file with secure secrets.

### 2. Add Your API Keys

Edit `.env` and add at least one LLM provider API key:

```bash
# Choose one or more:
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
COHERE_API_KEY=your-cohere-key
```

### 3. Setup Database

```bash
# Create the database
createdb ai_workforce

# Run migrations
npm run db:migrate
```

### 4. Start the Platform

```bash
npm run dev
```

This starts:
- Backend API on http://localhost:5000
- Frontend (if configured) on http://localhost:3000

## Test the API

### Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!"
  }'
```

Save the returned `token` for authenticated requests.

### Create an Agent

```bash
curl -X POST http://localhost:5000/api/admin/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ceo",
    "name": "CEO Assistant",
    "authorityLevel": "high"
  }'
```

### Chat with Agent

```bash
curl -X POST http://localhost:5000/api/agents/AGENT_ID/chat \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should be our top priority this quarter?"
  }'
```

## Testing Without API Keys

Run tests using mock LLM providers:

```bash
npm run test:unit
```

## Using Docker

```bash
# Start all services (PostgreSQL, Redis, Qdrant)
docker-compose up -d

# View logs
docker-compose logs -f backend
```

## Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. Check [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production setup
3. Explore the API endpoints and create more agents
4. Customize agent behaviors in `backend/src/agents/`

## Troubleshooting

**Database connection error?**
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**LLM API error?**
- Verify your API key is correct
- Check you have credits/quota remaining
- Try using the mock provider for testing

**Port already in use?**
```bash
# Change ports in .env
API_PORT=5001
APP_PORT=3001
```

## Get Help

- Full documentation: [README.md](./README.md)
- Technical specs: Original PDF in project root
- Issues: Check logs in `logs/` directory
