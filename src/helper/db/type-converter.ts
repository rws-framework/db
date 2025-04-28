import { ITrackerMetaOpts } from '../../models/_model';

/**
 * Handles type conversion for database schema generation
 */
export class TypeConverter {
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: ITrackerMetaOpts, dbType: string = 'mongodb'): string {
        const type = modelType.type;
        let input = type.name;

        // Handle basic types
        if (input == 'Number') {
            input = 'Int';
        }

        if (input == 'Object') {
            input = 'Json';
        }

        if (input == 'Date') {
            input = 'DateTime';
        }

        if (input == 'Boolean') {
            // Ensure Boolean is properly handled for all database types
            input = 'Boolean';
        }

        if (input == 'Array') {
            // Handle arrays differently based on database type
            if (dbType === 'mysql') {
                // MySQL doesn't support native arrays, use Json instead
                input = 'Json';
            } else {
                input = 'Json[]';
            }
        }

        const firstChar = input.charAt(0).toUpperCase();
        const restOfString = input.slice(1);
        let resultField = firstChar + restOfString;

        if (modelType.isArray) {
            // Handle arrays differently based on database type
            if (dbType === 'mysql') {
                // For MySQL, we don't append [] as it doesn't support native arrays
                // Instead, we'll store arrays as JSON
                resultField = 'Json';
            } else if (dbType === 'postgresql' || dbType === 'postgres') {
                // PostgreSQL supports arrays natively
                resultField += '[]';
            } else {
                resultField += '[]';
            }
        }

        // Apply any database-specific type modifiers from tags
        if (modelType.tags && modelType.tags.length > 0) {
            // Handle specific database type modifiers from tags
            // For example, if a tag specifies a VARCHAR length or TEXT type
            for (const tag of modelType.tags) {
                if (tag.startsWith('db.')) {
                    // This is a database-specific type modifier
                    // We'll handle it in the generateModelSections method
                }
            }
        }

        return resultField;
    }

    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata: ITrackerMetaOpts, dbType: string): string[] {
        const tags: string[] = [...(metadata.tags || [])];

        // Extract any database-specific options from the metadata
        // and convert them to appropriate Prisma schema tags
        if (metadata.dbOptions) {
            // Handle MySQL-specific options
            if (dbType === 'mysql' && metadata.dbOptions.mysql) {
                if (metadata.dbOptions.mysql.useText) {
                    tags.push('@db.Text');
                } else if (metadata.dbOptions.mysql.maxLength) {
                    tags.push(`@db.VarChar(${metadata.dbOptions.mysql.maxLength})`);
                }

                if (metadata.dbOptions.mysql.useUuid && metadata.tags?.includes('id')) {
                    tags.push('default(uuid())');
                }
            }

            // Handle PostgreSQL-specific options
            if ((dbType === 'postgresql' || dbType === 'postgres') && metadata.dbOptions.postgres) {
                if (metadata.dbOptions.postgres.useText) {
                    tags.push('@db.Text');
                }

                if (metadata.dbOptions.postgres.useUuid && metadata.tags?.includes('id')) {
                    tags.push('@default(uuid())');
                    tags.push('@db.Uuid');
                }
            }

            // Handle MongoDB-specific options
            if (dbType === 'mongodb' && metadata.dbOptions.mongodb) {
                if (metadata.dbOptions.mongodb.customType) {
                    tags.push(`@db.${metadata.dbOptions.mongodb.customType}`);
                }
            }
        }

        return tags;
    }
}
