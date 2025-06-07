import { IDbConfigHandler, IDbConfigParams, IdGeneratorOptions } from '../types/DbConfigHandler';
import { OpModelType } from '../models/_model';
import { DBService } from '../services/DBService';
import { rwsShell } from '@rws-framework/console';

import {
    DbUtils,
    TypeConverter,
    RelationManager,
    SchemaGenerator
} from './db';
import { IIdMetaOpts, IIdTypeOpts } from '../decorators/IdType';

/**
 * Database helper class
 * 
 * This class provides a facade for the database helper modules.
 * It delegates to the specialized modules for specific functionality.
 */
export class DbHelper {
    /**
     * The environment variable name for the Prisma database URL
     */
    static dbUrlVarName: string = SchemaGenerator.dbUrlVarName;

    /**
     * Install Prisma with the generated schema
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void> {
        return SchemaGenerator.installPrisma(configService, dbService, leaveFile);
    }

    /**
     * Push database models to the database
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async pushDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void> {
        return SchemaGenerator.pushDBModels(configService, dbService, leaveFile);
    }
   
    static async migrateDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void> {
       process.env = { ...process.env, [this.dbUrlVarName]: configService.get('db_url') };
       
        const [_, schemaPath] = DbUtils.getProcessedSchemaDir();

        await rwsShell.runCommand(`${DbUtils.detectInstaller()} prisma migrate dev --create-only --schema=${schemaPath}`, process.cwd());
    }

    /**
     * Generate model sections for the schema
     * @param model The model to generate a section for
     * @param configService The configuration service
     * @returns The model section
     */
    static async generateModelSections(
        model: OpModelType<any>,
        configService: IDbConfigHandler
    ): Promise<string> {
        return SchemaGenerator.generateModelSections(model, configService);
    }

    /**
     * Generate the base schema for Prisma
     * @param dbType The database type
     * @param dbUrl The database URL
     * @returns The base schema
     */
    static generateBaseSchema(dbType: string, dbUrl: string, output?: string, binaryTargets?: string[]): string {
        return SchemaGenerator.generateBaseSchema(dbType, dbUrl, output, binaryTargets);
    }

    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir(): [string, string] {
        return DbUtils.getSchemaDir();
    }

    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller(): string {
        return DbUtils.detectInstaller();
    }

    /**
     * Generate an ID field based on the database type
     */
    static generateId(
        dbType: IDbConfigParams['db_type'],
        modelMeta: Record<string, { annotationType: string, metadata: IIdMetaOpts }>
    ): string {
        return DbUtils.generateId(dbType, modelMeta);
    }

    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: any, dbType: IDbConfigParams['db_type'] = 'mongodb'): string {
        return TypeConverter.toConfigCase(modelType, dbType);
    }

    /**
     * Process type functions metadata to extract database-specific options
     */
    static processTypeOptions(metadata: any, dbType: string): string[] {
        return TypeConverter.processTypeOptions(metadata, dbType);
    }

    /**
     * Mark a relation between two models
     */
    static markRelation(relationKey: string, inverse: boolean = false): void {
        RelationManager.markRelation(relationKey, inverse);
    }

    /**
     * Complete a relation between two models
     */
    static completeRelation(relationKey: string, index: number, inverse: boolean = false): void {
        RelationManager.completeRelation(relationKey, index, inverse);
    }

    /**
     * Get a unique counter for a relation between two models
     */
    static getRelationCounter(relationKey: string, inverse: boolean = false): number {
        return RelationManager.getRelationCounter(relationKey, inverse);
    }

    /**
     * Generate a shortened relation name to stay within database limits
     */
    static getShortenedRelationName(modelName: string, relatedModelName: string, index: number): string {
        return RelationManager.getShortenedRelationName(modelName, relatedModelName, index);
    }
}
