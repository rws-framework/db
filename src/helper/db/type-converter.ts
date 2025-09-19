import { IDbOpts } from '../../models/interfaces/IDbOpts';
import { ITrackerMetaOpts } from '../../models/_model';
import { IIdMetaOpts } from '../../decorators/IdType';
import { DbUtils } from './utils';
import { IDbConfigParams } from '../../types/DbConfigHandler';

/**
 * Handles type conversion for database schema generation
 */
export class TypeConverter {
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType: ITrackerMetaOpts | IIdMetaOpts, dbType: IDbConfigParams['db_type'] = 'mongodb', isId: boolean = false, isIdOverride: boolean = false): string {
        const type = modelType.type;
        let input = type.name;    
            

        // Handle basic types
        if (input == 'Number') {
            let numberOverride = false;
            
            // Check for database-specific number type overrides
            if(modelType.dbOptions) {
                // For PostgreSQL, first check postgres-specific options, then inherit from mysql if available
                if ((dbType === 'postgresql' || dbType === 'postgres')) {
                    const pgOptions = modelType.dbOptions.postgres;
                    const mysqlOptions = modelType.dbOptions.mysql;
                    
                    // Use postgres-specific type if available, otherwise inherit from mysql
                    const typeSource = pgOptions?.useType ? pgOptions : mysqlOptions;
                    
                    if (typeSource?.useType) {
                        if(['db.Float'].includes(typeSource.useType)){
                            input = 'Float';
                            numberOverride = true;
                        }
                        
                        if(['db.Decimal'].includes(typeSource.useType)){
                            input = 'Decimal';
                            numberOverride = true;
                        }
                        
                        if(['db.DoublePrecision'].includes(typeSource.useType)){
                            input = 'Float'; // PostgreSQL DoublePrecision maps to Prisma Float
                            numberOverride = true;
                        }
                    }
                }
                // For MySQL, use mysql-specific options
                else if (dbType === 'mysql' && modelType.dbOptions.mysql) {
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
            }
            
            if(!numberOverride){
                input = 'Int';
            }            
        }

        if (input == 'BigInt') {
            input = 'BigInt';
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

        if(isId && !isIdOverride){
            return DbUtils.getDefaultPrismaType(dbType, false);
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
                    let tagName = metadata.dbOptions.mysql.useType;
                    let tagParams = '';
                    
                    // Handle different MySQL type formats - ensure db.something format
                    if (tagName === 'db.VarChar') {
                        tagName = '@db.VarChar';
                        if (metadata.dbOptions.mysql.maxLength) {
                            tagParams = `(${metadata.dbOptions.mysql.maxLength})`;
                        }
                    } else if (tagName === 'db.Float') {
                        tagName = '@db.Float';
                    } else if (tagName === 'db.Decimal') {
                        tagName = '@db.Decimal';
                        const params = metadata.dbOptions.mysql.params;
                        if (params && params.length > 0) {
                            tagParams = `(${params.join(', ')})`;
                        }
                    } else if (tagName.startsWith('db.')) {
                        tagName = `@${tagName}`;
                    }
                    
                    if (tagParams) {
                        tag = `${tagName}${tagParams}`;
                    } else {
                        tag = tagName;
                    }
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
            if ((dbType === 'postgresql' || dbType === 'postgres') && metadata.dbOptions) {
                const pgOptions = metadata.dbOptions.postgres;
                const mysqlOptions = metadata.dbOptions.mysql;
                
                // Use postgres-specific options if available, otherwise inherit from mysql
                const useText = pgOptions?.useText !== undefined ? pgOptions.useText : mysqlOptions?.useText;
                const useUuid = pgOptions?.useUuid !== undefined ? pgOptions.useUuid : mysqlOptions?.useUuid;
                const useType = pgOptions?.useType || mysqlOptions?.useType;
                
                if (useText) {
                    tags.push('@db.Text');
                }

                if (useType && !useText) {
                    let tagName = useType;
                    let tagParams = '';
                    
                    // Map MySQL-specific types to PostgreSQL equivalents - only handle db.something format
                    if (useType === 'db.Float') {
                        tagName = '@db.Real'; // PostgreSQL Real type
                    } else if (useType === 'db.Decimal') {
                        tagName = '@db.Decimal';
                        // Inherit params from the source (postgres or mysql)
                        const params = pgOptions?.params || mysqlOptions?.params;
                        if (params && params.length > 0) {
                            tagParams = `(${params.join(', ')})`;
                        }
                    } else if (useType === 'db.VarChar') {
                        tagName = '@db.VarChar';
                        // For VarChar, check maxLength from mysql options if not in postgres
                        const maxLength = mysqlOptions?.maxLength;
                        if (maxLength) {
                            tagParams = `(${maxLength})`;
                        }
                    } else if (useType.startsWith('db.')) {
                        tagName = `@${useType}`;
                    }
                    
                    if (tagParams) {
                        tags.push(`${tagName}${tagParams}`);
                    } else if (tagName !== useType) {
                        tags.push(tagName);
                    }
                }

                if (useUuid && metadata.tags?.includes('id')) {
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
