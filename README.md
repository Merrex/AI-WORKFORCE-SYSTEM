# AI Workforce Platform

## 🎯 Vision

**Type 1 vision: Minimal human effort, maximum monitoring, and delegated auto-pilot**

An AGI-ready, role-based, multi-agent AI system designed to act as a digital workforce for organizations. Each AI agent represents a business role (CEO, CFO, HR, Sales, Customer Support) and operates as a live assistant with human governance.

This system enables organizations to delegate operational intelligence to AI agents while maintaining full human oversight—maximizing efficiency through automation while ensuring accountability through transparent monitoring and approval workflows.

## 🎯 Overview

This platform enables organizations to deploy AI agents for key business roles, with:
- **Human-governed decision making** with escalation workflows
- **Multi-provider LLM support** (OpenAI, Anthropic, Cohere)
- **Persistent memory** using vector databases
- **Role-based access control** and permissions
- **Production-ready architecture** built for scale

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   Frontend (React Dashboard)       │
│   CEO | CFO | HR | Sales | Admin   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Backend API (Express + TypeScript)│
│   Auth | Agents | Decisions         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Agent Intelligence Layer          │
│   LLM | Memory | Orchestration      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Infrastructure                    │
│   PostgreSQL | Redis | Qdrant       │
└─────────────────────────────────────┘
```

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0
- Qdrant (vector database) - optional but recommended
- LLM API keys (OpenAI, Anthropic, or Cohere)

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd ai-workforce-platform
npm run setup
```

This will:
- Install all dependencies
- Generate `.env` file with secure secrets
- Create necessary directories

### 2. Configure Environment

Edit `.env` file and add your API keys:

```bash
# REQUIRED: Add your LLM provider API key(s)
OPENAI_API_KEY=sk-your-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
COHERE_API_KEY=your-key-here

# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ai_workforce

# Redis configuration
REDIS_URL=redis://localhost:6379

# Vector database (optional)
VECTOR_DB_URL=http://localhost:6333
```

### 3. Setup Database

```bash
# Create database
createdb ai_workforce

# Run migrations
npm run db:migrate
```

### 4. Start Development

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend  # API server on port 5000
npm run dev:frontend # Web app on port 3000
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Testing with Mock LLM

The platform includes a `MockLLMProvider` for testing without real API calls:

```typescript
import { MockLLMProvider } from './tests/mocks/MockLLMProvider';

const mockLLM = new MockLLMProvider({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key'
});

mockLLM.setDefaultResponse('Test response');
// Use in tests...
```

### Local Testing Without LLM Keys

For local development without LLM keys:

1. Use the mock provider in test mode
2. Set `NODE_ENV=test` to use mock responses
3. Run unit tests that don't require real API calls

```bash
NODE_ENV=test npm run dev:backend
```

## 📁 Project Structure

```
ai-workforce-platform/
├── backend/
│   ├── src/
│   │   ├── agents/          # Agent implementations
│   │   ├── api/             # REST API routes
│   │   ├── database/        # Database schema & migrations
│   │   ├── middleware/      # Auth, error handling
│   │   ├── services/        # LLM, memory, orchestration
│   │   └── utils/           # Logger, helpers
│   └── tests/
│       ├── unit/            # Unit tests
│       ├── integration/     # Integration tests
│       └── mocks/           # Test mocks
├── frontend/
│   └── src/
│       ├── components/      # React components
│       ├── pages/           # Page components
│       └── services/        # API client
├── shared/                  # Shared types & utilities
└── docs/                    # Documentation
```

## 🔑 Environment Variables Guide

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Auto-generated secret for JWT | Auto-generated |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `COHERE_API_KEY` | Cohere API key | - |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `VECTOR_DB_URL` | Qdrant vector DB URL | `http://localhost:6333` |
| `LOG_LEVEL` | Logging level | `info` |

## 🔒 Security Considerations

1. **API Keys**: Never commit API keys. They are stored in `.env` (git-ignored)
2. **JWT Secrets**: Auto-generated during setup, change in production
3. **HTTPS**: Use HTTPS in production
4. **RBAC**: All routes protected with role-based access control
5. **Input Validation**: All inputs validated before processing

## 🏢 User Management

### Creating Users

```bash
# Via API
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "secure-password",
    "name": "Admin User",
    "role": "admin"
  }'
```

### Roles

- `admin`: Full system access, can manage agents
- `ceo`: Executive-level access and decisions
- `cfo`: Finance-related operations
- `hr`: Human resources management
- `sales`: Sales and marketing operations
- `support`: Customer support functions

## 🤖 Agent Configuration

### Creating an Agent

```bash
curl -X POST http://localhost:5000/api/admin/agents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ceo",
    "name": "Executive AI Assistant",
    "authorityLevel": "high",
    "assignedUserId": "user-id"
  }'
```

### Authority Levels

- **Low**: Requires approval for medium/high sensitivity decisions
- **Medium**: Requires approval only for high sensitivity
- **High**: Requires approval only for critical decisions

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/:id/chat` - Chat with agent

### Admin
- `POST /api/admin/agents` - Create agent
- `PUT /api/admin/agents/:id` - Update agent
- `DELETE /api/admin/agents/:id` - Delete agent

### Decisions
- `GET /api/decisions/pending` - Get pending decisions
- `POST /api/decisions/:id/approve` - Approve decision
- `POST /api/decisions/:id/reject` - Reject decision

## 🔄 Decision Flow

1. Agent receives user query
2. Agent analyzes with LLM and determines sensitivity
3. If low sensitivity + authorized → Execute immediately
4. If medium/high sensitivity → Create decision record
5. Human approves or rejects via dashboard
6. Agent executes or escalates based on result

## 📈 Monitoring & Logging

Logs are written to:
- Console (formatted for development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

```bash
# View logs in real-time
tail -f logs/combined.log
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql postgresql://localhost:5432/ai_workforce
```

### LLM API Errors

- Verify API keys are correct
- Check rate limits and quotas
- Use mock provider for testing

### Vector Database Issues

- Qdrant is optional; system falls back to SQL search
- Install Qdrant: `docker run -p 6333:6333 qdrant/qdrant`

## 📚 Documentation

- [Technical DPR](./docs/TECHNICAL_DPR.md) - Full technical specification
- [API Documentation](./docs/API.md) - Complete API reference
- [Agent Development](./docs/AGENT_DEVELOPMENT.md) - Creating custom agents
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment

## 🤝 Contributing

This is a preview-level implementation. To extend:

1. Add new agent roles in `backend/src/agents/`
2. Implement custom LLM providers
3. Add frontend dashboards
4. Extend permission system

## 📝 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

Built following the Technical DPR for AGI-Ready Multi-Agent AI Workforce Platform.
Authored by: Mayur Kr. Yadav

---

**Important**: This is a prototype/preview implementation. Before production use:
- Implement proper database migrations
- Add comprehensive error handling
- Set up monitoring and alerting
- Conduct security audit
- Add rate limiting and DDoS protection
- Implement proper backup strategies
