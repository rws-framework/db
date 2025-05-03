import { IDbOpts } from '../../models/interfaces/IDbOpts';
import { ITrackerMetaOpts } from '../../models/_model';
import { IIdMetaOpts } from 'src/decorators/IdType';

/**
 * Handles type conversion for database schema generation
 */
export class TypeConverter {
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: ITrackerMetaOpts | IIdMetaOpts, dbType: string = 'mongodb', isId: boolean = false): string {
        const type = modelType.type;
        let input = type.name;    
            

        // Handle basic types
        if (input == 'Number') {
            let numberOverride = false;
            if(modelType.dbOptions && modelType.dbOptions.mysql){
                if(modelType.dbOptions.mysql.useType){
                    if(['db.Float'].includes(modelType.dbOptions.mysql.useType)){
                        input = 'Float';
                        numberOverride = true;
                    }

                    if(['db.Decimal'].includes(modelType.dbOptions.mysql.useType)){
                        input = 'Decimal';
                        numberOverride = true;
                    }
                }
            }
            
            if(!numberOverride){
                input = 'Int';
            }            
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

        if(isId){
            return dbType === 'mongodb' ? 'String' : 'Int';
        }

        const trackerModelType = modelType as ITrackerMetaOpts;

        if (trackerModelType.isArray) {
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

        return resultField;
    }

    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata: { tags: string[], dbOptions: IDbOpts['dbOptions'] }, dbType: string): string[] {
        const tags: string[] = [...(metadata.tags || [])];

        // Extract any database-specific options from the metadata
        // and convert them to appropriate Prisma schema tags
        if (metadata.dbOptions) {
            // Handle MySQL-specific options
            if (dbType === 'mysql' && metadata.dbOptions.mysql) {
                let tag = null;

                if (metadata.dbOptions.mysql.useType && !metadata.dbOptions.mysql.useText) {
                    const tagName = metadata.dbOptions.mysql.useType === 'VarChar' ?  'db.' + metadata.dbOptions.mysql.useType : metadata.dbOptions.mysql.useType;                    
                    let tagParams = tagName === 'db.VarChar' && metadata.dbOptions.mysql.maxLength ? metadata.dbOptions.mysql.maxLength : (metadata.dbOptions.mysql?.params?.join(', ') || '');                    
                    tag = `@${tagName}(${tagParams})`;                    
                }

                if (metadata.dbOptions.mysql.useText) {
                    tags.push('@db.Text');
                }

                if(tag){
                    tags.push(tag);
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
