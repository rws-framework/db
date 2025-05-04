import { IDbConfigParams } from '../../types/DbConfigHandler';
import { IIdMetaOpts } from '../../decorators/IdType';
/**
 * Utility functions for database operations
 */
export declare class DbUtils {
    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir(): [string, string];
    static getProcessedSchemaDir(): [string, string];
    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller(): string;
    /**
     * Generate an ID field based on the database type
     */
    static generateId(dbType: IDbConfigParams['db_type'], modelMeta: Record<string, {
        annotationType: string;
        metadata: IIdMetaOpts;
    }>, optional?: boolean): string;
    static getDefaultPrismaType(dbType: IDbConfigParams['db_type'], useUuid: boolean): string;
    static doesUseUuid(modelMeta: Record<string, {
        annotationType: string;
        metadata: IIdMetaOpts;
    }>): boolean;
    static addIdPart(dbType: IDbConfigParams['db_type'], useUuid: boolean, noAuto?: boolean): string;
    static generateIdDefault(dbType: IDbConfigParams['db_type'], useUuid: boolean): string;
}
export declare const workspaceRootPath: string;
export declare const moduleDirPath: string;
