import {
  StartedPostgreSqlContainer,
  PostgreSqlContainer,
} from '@testcontainers/postgresql';
import camelcaseKeys from 'camelcase-keys';
import { snakeCase } from 'lodash';
import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs';

export class TestDb {
  private container: StartedPostgreSqlContainer;
  private knex: Knex;

  constructor(private readonly tables: string[]) {}

  get instance(): Knex {
    return this.knex;
  }

  private async runMigrations() {
    const migrationsDir = path.join(
      __dirname,
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
        for (const statement of statements) await trx.raw(statement);
      });
    }
  }

  async init() {
    this.container = await new PostgreSqlContainer(
      'postgres:16-alpine',
    ).start();

    process.env.DATABASE_HOST = this.container.getHost();
    process.env.DATABASE_PORT = this.container.getPort().toString();
    process.env.DATABASE_USERNAME = this.container.getUsername();
    process.env.DATABASE_PASSWORD = this.container.getPassword();
    process.env.DATABASE_NAME = this.container.getDatabase();

    this.knex = knex({
      connection: this.container.getConnectionUri(),
      pool: { min: 0, max: 5 },
      searchPath: ['public'],
      client: 'pg',
      wrapIdentifier: (value, origImpl) => origImpl(snakeCase(value)),
      postProcessResponse: (result) => {
        if (Array.isArray(result)) {
          return result.map((row) => camelcaseKeys(row, { deep: true }));
        }
        if (result && typeof result === 'object') {
          return camelcaseKeys(result, { deep: true });
        }
        return result;
      },
    });

    await this.runMigrations();
  }

  async clean() {
    await this.knex.raw('SET CONSTRAINTS ALL DEFERRED');
    for (const table of this.tables)
      await this.knex.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    await this.knex.raw('SET CONSTRAINTS ALL IMMEDIATE');
  }

  async destroy() {
    if (this.knex) await this.knex.destroy();
    if (this.container) await this.container.stop();
  }
}
