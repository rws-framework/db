"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeConverter = void 0;
/**
 * Handles type conversion for database schema generation
 */
class TypeConverter {
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType, dbType = 'mongodb', isId = false) {
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
            }
            else {
                input = 'Json[]';
            }
        }
        const firstChar = input.charAt(0).toUpperCase();
        const restOfString = input.slice(1);
        let resultField = firstChar + restOfString;
        if (isId) {
            return dbType === 'mongodb' ? 'String' : 'Int';
        }
        const trackerModelType = modelType;
        if (trackerModelType.isArray) {
            // Handle arrays differently based on database type
            if (dbType === 'mysql') {
                // For MySQL, we don't append [] as it doesn't support native arrays
                // Instead, we'll store arrays as JSON
                resultField = 'Json';
            }
            else if (dbType === 'postgresql' || dbType === 'postgres') {
                // PostgreSQL supports arrays natively
                resultField += '[]';
            }
            else {
                resultField += '[]';
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
    static processTypeOptions(metadata, dbType) {
        var _a, _b;
        const tags = [...(metadata.tags || [])];
        // Extract any database-specific options from the metadata
        // and convert them to appropriate Prisma schema tags
        if (metadata.dbOptions) {
            // Handle MySQL-specific options
            if (dbType === 'mysql' && metadata.dbOptions.mysql) {
                if (metadata.dbOptions.mysql.useText) {
                    tags.push('@db.Text');
                }
                else if (metadata.dbOptions.mysql.maxLength) {
                    tags.push(`@db.VarChar(${metadata.dbOptions.mysql.maxLength})`);
                }
                if (metadata.dbOptions.mysql.useUuid && ((_a = metadata.tags) === null || _a === void 0 ? void 0 : _a.includes('id'))) {
                    tags.push('default(uuid())');
                }
            }
            // Handle PostgreSQL-specific options
            if ((dbType === 'postgresql' || dbType === 'postgres') && metadata.dbOptions.postgres) {
                if (metadata.dbOptions.postgres.useText) {
                    tags.push('@db.Text');
                }
                if (metadata.dbOptions.postgres.useUuid && ((_b = metadata.tags) === null || _b === void 0 ? void 0 : _b.includes('id'))) {
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
exports.TypeConverter = TypeConverter;
