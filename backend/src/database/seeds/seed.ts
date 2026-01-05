import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from '../schema';
import { logger } from '../../utils/logger';

interface SeedData {
  organization: {
    name: string;
    manifesto: any;
  };
  adminUser: {
    email: string;
    password: string;
    name: string;
  };
  agents: Array<{
    role: 'ceo' | 'cfo' | 'hr' | 'sales' | 'support';
    name: string;
    authorityLevel: 'low' | 'medium' | 'high';
    description?: string;
  }>;
}

export async function seedDatabase(seedFile?: string): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    // Determine which seed file to use
    const seedMode = seedFile || process.env.SEED_FILE || 'startup-demo';
    const seedPath = path.join(__dirname, 'data', `${seedMode}.json`);

    // Check if seed file exists
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found: ${seedPath}`);
    }

    // Load seed data
    const seedDataRaw = fs.readFileSync(seedPath, 'utf-8');
    const seedData: SeedData = JSON.parse(seedDataRaw);

    logger.info(`Loading seed data from: ${seedMode}.json`);

    // Check if organization already exists
    const existingOrg = await db
      .selectFrom('organizations')
      .selectAll()
      .where('name', '=', seedData.organization.name)
      .executeTakeFirst();

    if (existingOrg) {
      logger.warn(`Organization "${seedData.organization.name}" already exists. Skipping seed.`);
      return;
    }

    // Create organization
    const orgId = uuidv4();
    await db
      .insertInto('organizations')
      .values({
        id: orgId,
        name: seedData.organization.name,
        manifesto: seedData.organization.manifesto,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    logger.info(`✓ Organization created: ${seedData.organization.name}`);

    // Create admin user
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(seedData.adminUser.password, 12);

    await db
      .insertInto('users')
      .values({
        id: userId,
        email: seedData.adminUser.email,
        password_hash: hashedPassword,
        name: seedData.adminUser.name,
        role: 'admin',
        organization_id: orgId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    logger.info(`✓ Admin user created: ${seedData.adminUser.email}`);

    // Create agents
    for (const agentData of seedData.agents) {
      const agentId = uuidv4();
      
      await db
        .insertInto('agents')
        .values({
          id: agentId,
          role: agentData.role,
          name: agentData.name,
          organization_id: orgId,
          assigned_user_id: null,
          status: 'active',
          permissions: {
            canApprove: agentData.authorityLevel === 'high',
            canEscalate: true,
            canAccessFinancials: agentData.role === 'cfo' || agentData.role === 'ceo',
            canManageTeam: agentData.role === 'hr' || agentData.role === 'ceo'
          },
          authority_level: agentData.authorityLevel,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();

      logger.info(`✓ Agent created: ${agentData.name} (${agentData.role})`);
    }

    logger.info('✅ Database seeding completed successfully!');
    logger.info(`
==============================================
🎉 Seed Data Summary:
==============================================
Organization: ${seedData.organization.name}
Stage: ${seedData.organization.manifesto.stage || 'N/A'}
Admin Email: ${seedData.adminUser.email}
Admin Password: ${seedData.adminUser.password}
Agents Created: ${seedData.agents.length}
==============================================
⚠️  IMPORTANT: Save the admin credentials above!
==============================================
    `);

  } catch (error) {
    logger.error('Database seeding failed', { error });
    throw error;
  }
}

// Allow running directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed script failed', { error });
      process.exit(1);
    });
}
