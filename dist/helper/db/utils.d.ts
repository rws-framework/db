import { IDbConfigParams, IdGeneratorOptions } from '../../types/DbConfigHandler';
/**
 * Utility functions for database operations
 */
export declare class DbUtils {
    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir(): [string, string];
    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller(): string;
    /**
     * Generate an ID field based on the database type
     */
    static generateId(dbType: IDbConfigParams['db_type'], options?: IdGeneratorOptions): string;
}
export declare const workspaceRootPath: string;
export declare const moduleDirPath: string;
