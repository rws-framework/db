import { rwsPath } from '@rws-framework/console';
import path from 'path';
import fs from 'fs';
import { IDbConfigParams, IdGeneratorOptions } from '../../types/DbConfigHandler';

const workspaceRoot = rwsPath.findRootWorkspacePath();
const moduleDir = path.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');

/**
 * Utility functions for database operations
 */
export class DbUtils {
    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir(): [string, string] {
        const schemaDir = path.join(moduleDir, 'prisma');
        const schemaPath = path.join(schemaDir, 'schema.prisma');

        return [schemaDir, schemaPath];
    }

    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller(): string {
        if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {
            return 'yarn';
        }

        return 'npx';
    }

    /**
     * Generate an ID field based on the database type
     */
    static generateId(
        dbType: IDbConfigParams['db_type'],
        options: IdGeneratorOptions = {}
    ): string {
        const { useUuid = false, customType } = options;

        if (customType) {
            return `id ${customType} @id`;
        }

        switch (dbType) {
            case 'mongodb':
                return 'id String @id @default(auto()) @map("_id") @db.ObjectId';

            case 'mysql':
                return useUuid
                    ? 'id String @id @default(uuid())'
                    : 'id Int @id @default(autoincrement())';

            case 'postgresql':
            case 'postgres':
                return useUuid
                    ? 'id String @id @default(uuid())'
                    : 'id Int @id @default(autoincrement())';

            case 'sqlite':
                return 'id Int @id @default(autoincrement())';

            default:
                throw new Error(`DB type "${dbType}" is not supported!`);
        }
    }
}

export const workspaceRootPath = workspaceRoot;
export const moduleDirPath = moduleDir;
