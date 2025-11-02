import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from '@testcontainers/postgresql';
import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs';

export class TestDb {
  private container: StartedPostgreSqlContainer;
  private knex: Knex;

  get instance(): Knex {
    return this.knex;
  }

  private async handleRunMigrations() {
    const migrationsDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      './database/migration',
    );

    if (!fs.existsSync(migrationsDir)) return;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationSqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationSqlPath, 'utf8');
      const statements = sql
        .split(/-->\s*statement-breakpoint/g)
        .map((statement) => statement.trim())
        .filter(Boolean);

      await this.knex.transaction(async (trx) => {
        for (const statement of statements) {
          await trx.raw(statement);
        }
      });
    }
  }

  async init() {
    this.container = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start();

    const connectionUrl = this.container.getConnectionUri();

    process.env.DATABASE_URL = connectionUrl;

    this.knex = knex({
      connection: connectionUrl,
      pool: { min: 0, max: 5 },
      searchPath: ['public'],
      client: 'pg',
    });

    await this.handleRunMigrations();
  }

  async clean(tables: string[]) {
    await this.knex.raw('SET CONSTRAINTS ALL DEFERRED');
    for (const table of tables)
      await this.knex.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    await this.knex.raw('SET CONSTRAINTS ALL IMMEDIATE');
  }

  async destroy() {
    if (this.knex) await this.knex.destroy();
    if (this.container) await this.container.stop();
  }
}
