import { IDbConfigHandler } from '../../types/DbConfigHandler';
import { OpModelType } from '../../models/_model';
import { DBService } from '../../services/DBService';
/**
 * Handles Prisma schema generation
 */
export declare class SchemaGenerator {
    static dbUrlVarName: string;
    /**
     * Generate the base schema for Prisma
     * @param dbType The database type
     * @param dbUrl The database URL
     * @returns The base schema
     */
    static generateBaseSchema(dbType: string, dbUrl: string): string;
    /**
     * Generate model sections for the schema
     * @param model The model to generate a section for
     * @param configService The configuration service
     * @returns The model section
     */
    static generateModelSections(model: OpModelType<any>, configService: IDbConfigHandler): Promise<string>;
    private static getSuperFieldFromModel;
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
}
