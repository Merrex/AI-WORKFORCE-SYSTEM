import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

// Database Tables
export interface UsersTable {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'ceo' | 'cfo' | 'hr' | 'sales' | 'support';
  organization_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationsTable {
  id: string;
  name: string;
  manifesto: object; // Business policies and priorities
  created_at: Date;
  updated_at: Date;
}

export interface AgentsTable {
  id: string;
  role: 'ceo' | 'cfo' | 'hr' | 'sales' | 'support';
  name: string;
  organization_id: string;
  assigned_user_id: string | null;
  status: 'active' | 'inactive' | 'suspended';
  permissions: object; // Role-specific permissions
  authority_level: 'low' | 'medium' | 'high';
  created_at: Date;
  updated_at: Date;
}

export interface DecisionsTable {
  id: string;
  agent_id: string;
  organization_id: string;
  title: string;
  description: string;
  sensitivity: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'escalated';
  recommendation: object;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MemoryTable {
  id: string;
  agent_id: string;
  organization_id: string;
  memory_type: 'short_term' | 'episodic' | 'role' | 'org';
  content: object;
  embedding_id: string | null;
  created_at: Date;
}

export interface Database {
  users: UsersTable;
  organizations: OrganizationsTable;
  agents: AgentsTable;
  decisions: DecisionsTable;
  memory: MemoryTable;
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  max: parseInt(process.env.DATABASE_POOL_MAX || '10')
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool })
});
