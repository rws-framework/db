import { IDbConfigHandler, IDbConfigParams } from '../types/DbConfigHandler';
import { OpModelType } from '../models/_model';
import { DBService } from '../services/DBService';
import { IIdMetaOpts } from '../decorators/IdType';
/**
 * Database helper class
 *
 * This class provides a facade for the database helper modules.
 * It delegates to the specialized modules for specific functionality.
 */
export declare class DbHelper {
    /**
     * The environment variable name for the Prisma database URL
     */
    static dbUrlVarName: string;
    /**
     * Install Prisma with the generated schema
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    /**
     * Push database models to the database
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static pushDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    static migrateDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    /**
     * Generate model sections for the schema
     * @param model The model to generate a section for
     * @param configService The configuration service
     * @returns The model section
     */
    static generateModelSections(model: OpModelType<any>, configService: IDbConfigHandler): Promise<string>;
    /**
     * Generate the base schema for Prisma
     * @param dbType The database type
     * @param dbUrl The database URL
     * @returns The base schema
     */
    static generateBaseSchema(dbType: string, dbUrl: string): string;
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
    static generateId(dbType: IDbConfigParams['db_type'], modelMeta: Record<string, {
        annotationType: string;
        metadata: IIdMetaOpts;
    }>): string;
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: any, dbType?: IDbConfigParams['db_type']): string;
    /**
     * Process type functions metadata to extract database-specific options
     */
    static processTypeOptions(metadata: any, dbType: string): string[];
    /**
     * Mark a relation between two models
     */
    static markRelation(relationKey: string, inverse?: boolean): void;
    /**
     * Complete a relation between two models
     */
    static completeRelation(relationKey: string, index: number, inverse?: boolean): void;
    /**
     * Get a unique counter for a relation between two models
     */
    static getRelationCounter(relationKey: string, inverse?: boolean): number;
    /**
     * Generate a shortened relation name to stay within database limits
     */
    static getShortenedRelationName(modelName: string, relatedModelName: string, index: number): string;
}
