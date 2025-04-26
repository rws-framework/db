import { IMetaOpts } from '../../models/_model';
/**
 * Handles type conversion for database schema generation
 */
export declare class TypeConverter {
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: IMetaOpts, dbType?: string): string;
    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata: IMetaOpts, dbType: string): string[];
}
