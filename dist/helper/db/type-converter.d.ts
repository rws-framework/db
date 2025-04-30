import { IDbOpts } from '../../models/interfaces/IDbOpts';
import { ITrackerMetaOpts } from '../../models/_model';
import { IIdMetaOpts } from 'src/decorators/IdType';
/**
 * Handles type conversion for database schema generation
 */
export declare class TypeConverter {
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: ITrackerMetaOpts | IIdMetaOpts, dbType?: string, isId?: boolean): string;
    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata: {
        tags: string[];
        dbOptions: IDbOpts['dbOptions'];
    }, dbType: string): string[];
}
