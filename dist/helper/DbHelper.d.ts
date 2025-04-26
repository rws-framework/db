import { IDbConfigHandler, IDbConfigParams, IdGeneratorOptions } from '../types/DbConfigHandler';
import { IMetaOpts, OpModelType } from '../models/_model';
import { DBService } from '../services/DBService';
export declare class DbHelper {
    static dbUrlVarName: string;
    private static allRelations;
    static installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    static getShortenedRelationName(modelName: string, relatedModelName: string, index: number): string;
    static markRelation(relationKey: string, inverse?: boolean): void;
    static completeRelation(relationKey: string, index: number, inverse?: boolean): void;
    static generateBaseSchema(dbType: string, dbUrl: string): string;
    static getSchemaDir(): [string, string];
    static generateId(dbType: IDbConfigParams['db_type'], options?: IdGeneratorOptions): string;
    static detectInstaller(): string;
    static pushDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile?: boolean): Promise<void>;
    static generateModelSections(model: OpModelType<any>, configService: IDbConfigHandler): Promise<string>;
    static toConfigCase(modelType: IMetaOpts, dbType?: string): string;
    /**
     * Get a unique counter for a relation between two models
     * @param relationKey A unique key for the relation
     * @returns A unique counter for this relation
     */
    static getRelationCounter(relationKey: string, inverse?: boolean): number;
    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata: IMetaOpts, dbType: string): string[];
}
