import { rwsShell, rwsPath } from '@rws-framework/console';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

import { IDbConfigHandler, IDbConfigParams, IdGeneratorOptions } from '../types/DbConfigHandler';
import { IMetaOpts, OpModelType, RWSModel } from '../models/_model';
// import TimeSeriesModel from '../models/core/TimeSeriesModel';
import { DBService } from '../services/DBService';
import { IRelationOpts } from '../decorators/Relation';
import { InverseRelationOpts } from '../decorators/InverseRelation';

const log = console.log;
const workspaceRoot = rwsPath.findRootWorkspacePath();
const moduleDir = path.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');

export class DbHelper {
    static dbUrlVarName: string = 'PRISMA_DB_URL';
    private static allRelations = new Map<string, {base: boolean | null, inversion: boolean | null}[]>();       

    static async installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void> {
        const dbUrl = configService.get('db_url');
        const dbType = configService.get('db_type') || 'mongodb';

        let template: string = this.generateBaseSchema(dbType, dbUrl);

        const dbModels: OpModelType<unknown>[] | null = configService.get('db_models');

        if (dbModels) {
            // First, collect all relations to ensure we can create inverse relations

            // Collect all relations
            for (const model of dbModels) {
                const modelName = (model as any)._collection;
                const modelMetadatas: Record<string, { annotationType: string, metadata: any }> = await RWSModel.getModelAnnotations(model);
                
                for (const key in modelMetadatas) {
                    const annotationType: string = modelMetadatas[key].annotationType;

                    if (annotationType === 'Relation') {
                        const relationMeta = modelMetadatas[key].metadata as IRelationOpts;
                        
                        const relatedModel = relationMeta.relatedTo as OpModelType<any>;
                        const relatedModelName = relatedModel._collection;

                        const relationKey = [modelName, relatedModelName].join('_');                      
                   

                        // // Skip self-relations for now
                        // if (modelName === relatedModelName) {
                        //     console.log('SKIP REL')   
                        //     continue;
                        // }

                        // Add this relation to the map
                        this.markRelation(relationKey);                                  
                    }
                    
                    if(annotationType === 'InverseRelation'){
                        const relationMeta = modelMetadatas[key].metadata as InverseRelationOpts;
                        const relatedModel = relationMeta.inversionModel as OpModelType<any>;
                        
                        const relatedModelName = relatedModel._collection;
            

                        const relationKey = [relatedModelName, modelName].join('_');                      
                        // // Skip self-relations for now
                        // if (modelName === relatedModelName){ 
                        //     console.log('SKIP INV', modelName)                        
                        //     continue; 
                        // };
                        this.markRelation(relationKey, true);
                    }
                }
            }            

            // Now generate the model sections with all relations
            for (const model of dbModels) {
                const modelSection = await DbHelper.generateModelSections(model, configService);

                template += '\n\n' + modelSection;

                log(chalk.green('[RWS]'), chalk.blue('Building DB Model'), model.name);
            }

            const [schemaDir, schemaPath] = this.getSchemaDir();

            if (!fs.existsSync(schemaDir)) {
                fs.mkdirSync(schemaDir);
            }

            if (fs.existsSync(schemaPath)) {
                fs.unlinkSync(schemaPath);
            }

            fs.writeFileSync(schemaPath, template);

            await rwsShell.runCommand(`${this.detectInstaller()} prisma generate --schema=${schemaPath}`, process.cwd());

            leaveFile = false;
            log(chalk.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);

            if (!leaveFile) {
                // fs.unlinkSync(schemaPath);
            }
        }
    }

    static markRelation(relationKey: string, inverse: boolean = false)
    {        
        if (!this.allRelations.has(relationKey)) {
            this.allRelations.set(relationKey, [])
        }        

        const modelRelations = this.allRelations.get(relationKey);

        let marked = false;

        for(const relationInfo of modelRelations){   
            if((relationInfo.base !== null && !inverse) || (relationInfo.inversion !== null  && inverse)){   
                continue;
            }

            if(inverse){
                relationInfo.inversion = false;
                marked = true;                
            }else{                
                relationInfo.base = false;
                marked = true;                
            }                
            return;
        }

        if(!marked){
            modelRelations.push({base: inverse ? null : false, inversion: inverse ? false : null})
        }                  
    }

    static completeRelation(relationKey: string, index: number, inverse: boolean = false)
    {   
        const modelRelations = this.allRelations.get(relationKey);

        if(inverse){
            modelRelations[index].inversion = true;
        }else{
            modelRelations[index].base = true;
        }        
    }

    static generateBaseSchema(dbType: string, dbUrl: string): string {
        process.env = { ...process.env, [this.dbUrlVarName]: dbUrl }

        return `generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "${dbType}"
    url = env("${this.dbUrlVarName}")
}`;
    }

    static getSchemaDir(): [string, string] {
        const schemaDir = path.join(moduleDir, 'prisma');
        const schemaPath = path.join(schemaDir, 'schema.prisma');

        return [schemaDir, schemaPath];
    }

    static generateId(
        dbType: IDbConfigParams['db_type'],
        options: IdGeneratorOptions = {}
    ): string {
        const { useUuid = false, customType } = options;

        if (customType) {
            return `id ${customType} @id`;
        }

        switch (dbType) {
            case 'mongodb':
                return 'id String @id @default(auto()) @map("_id") @db.ObjectId';

            case 'mysql':
                return useUuid
                    ? 'id String @id @default(uuid())'
                    : 'id Int @id @default(autoincrement())';

            case 'postgresql':
            case 'postgres':
                return useUuid
                    ? 'id String @id @default(uuid())'
                    : 'id Int @id @default(autoincrement())';

            case 'sqlite':
                return 'id Int @id @default(autoincrement())';

            default:
                throw new Error('Kurwa, nieobsługiwany typ bazy danych!');
        }
    }

    static detectInstaller(): string {

        if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {
            return 'yarn';
        }

        return 'npx';
    }

    static async pushDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile = false) {
        process.env = { ...process.env, [this.dbUrlVarName]: configService.get('db_url') }

        const schemaPath = path.join(workspaceRoot, 'node_modules', '.prisma', 'client', 'schema.prisma');

        await rwsShell.runCommand(`${this.detectInstaller()} prisma db push --schema=${schemaPath}`, process.cwd());

    }

    static async generateModelSections(
        model: OpModelType<any>,
        configService: IDbConfigHandler
    ): Promise<string> {
        let section = '';
        const modelMetadatas: Record<string, { annotationType: string, metadata: any }> = await RWSModel.getModelAnnotations(model);
        const dbType = configService.get('db_type') || 'mongodb';
        const modelName: string = (model as any)._collection;

        section += `model ${modelName} {\n`;
        section += `\t${this.generateId(dbType)}\n`;    

        for (const key in modelMetadatas) {
            const modelMetadata = modelMetadatas[key].metadata;
            let requiredString = modelMetadata.required ? '' : '?';
            const annotationType: string = modelMetadatas[key].annotationType;

            if (key === 'id') {
                continue;
            }


            if (annotationType === 'Relation') {
                const relationMeta = modelMetadata as IRelationOpts

                const relatedModel = relationMeta.relatedTo as OpModelType<any>;
                const isMany = relationMeta.many;
                const cascadeOpts = [];

                if (relationMeta.cascade?.onDelete) {
                    cascadeOpts.push(`onDelete: ${relationMeta.cascade.onDelete}`);
                }

                if (relationMeta.cascade?.onUpdate) {
                    cascadeOpts.push(`onUpdate: ${relationMeta.cascade.onUpdate}`);
                }

                const relatedModelName = relatedModel._collection;
                const relationKey = [modelName, relatedModelName].join('_');
                
                const relationIndex = this.getRelationCounter(relationKey);
               

                if (isMany) {                   
                    // Generate a very short relation name using a counter
                    // Use a consistent key for both sides of the relation to ensure the same name is used
                
                    const relationName = `${modelName}_${relatedModelName}_${relationIndex}`.toLowerCase();

                    // Generate a very short map name
                    const mapName = `${modelName}_${relatedModelName}_${relationIndex}`.toLowerCase();

                    // Add an inverse field to the related model if it doesn't exist
                    const inverseFieldName = `${modelName.toLowerCase()}_${key}`;
                    section += `\t${key} ${relatedModel._collection}[] @relation("${relationName}", map: "${mapName}")\n`;
                } else {
                    // Handle one-to-one or many-to-one relation
                    // Use the original relation field name (converted to lowercase) to ensure uniqueness
                    // This is important for models with multiple relations to the same model
                    const relationFieldName = key.toLowerCase() + '_' + modelMetadata.relationField.toLowerCase();
                    // Use a consistent key for both sides of the relation to ensure the same name is used                    
                    const relationName = `${modelName}_${relatedModelName}_${relationIndex}`.toLowerCase();

                    // Generate a very short map name
                    const mapName = `${modelName}_${relatedModelName}_${relationIndex}`.toLowerCase();

                    section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${relationName}", fields: [${relationFieldName}], references: [${modelMetadata.relatedToField || 'id'}], map: "${mapName}", ${cascadeOpts.join(', ')})\n`;

                    // Add relation field with appropriate type based on database
                    if (dbType === 'mongodb') {
                        section += `\t${relationFieldName} String${requiredString} @db.ObjectId\n`;
                    } else if (dbType === 'mysql') {
                        // For MySQL, determine the type based on the related model's ID type
                        const useUuid = relationMeta.useUuid || false;
                        if (useUuid) {
                            section += `\t${relationFieldName} String${requiredString}\n`;
                        } else {
                            section += `\t${relationFieldName} Int${requiredString}\n`;
                        }
                    } else if (dbType === 'postgresql' || dbType === 'postgres') {
                        // For PostgreSQL, use appropriate types
                        const useUuid = relationMeta.useUuid || false;
                        if (useUuid) {
                            section += `\t${relationFieldName} String${requiredString} @db.Uuid\n`;
                        } else {
                            section += `\t${relationFieldName} Int${requiredString}\n`;
                        }
                    } else {
                        // Default for other databases
                        section += `\t${relationFieldName} String${requiredString}\n`;
                    }
                }

                this.completeRelation(relationKey, relationIndex);
            } else if (annotationType === 'InverseRelation') {
                const relationMeta = modelMetadata as InverseRelationOpts;

                // Check if we need a custom relation name (if there are multiple relations to the same model)
                const relatedModelName = relationMeta.inversionModel._collection;

                // Generate a very short relation name using a counter
                // Use a consistent key for both sides of the relation to ensure the same name is used
                const relationKey = [relatedModelName, modelName].join('_');
                const relationIndex = this.getRelationCounter(relationKey, true);

                const relationName = `${relatedModelName}_${modelName}_${relationIndex}`.toLowerCase();

                // Generate a very short map name
                const mapName = `${relatedModelName}_${modelName}_${relationIndex}`.toLowerCase();

                // Add an inverse field to the related model if it doesn't exist
                const inverseFieldName = `${modelName.toLowerCase()}_${key}`;

                section += `\t${key} ${relationMeta.inversionModel._collection}[] @relation("${relationName}", map: "${mapName}")\n`;
                
                this.completeRelation(relationKey, relationIndex, true);
            } else if (annotationType === 'InverseTimeSeries') {
                if (dbType === 'mongodb') {
                    section += `\t${key} String[] @db.ObjectId\n`;
                } else if (dbType === 'mysql') {
                    // For MySQL, we need a different approach for arrays
                    section += `\t${key} Json\n`;
                } else if (dbType === 'postgresql' || dbType === 'postgres') {
                    // PostgreSQL supports arrays natively
                    section += `\t${key} String[]\n`;
                } else {
                    section += `\t${key} String[]\n`;
                }
            } else if (annotationType === 'TrackType') {
                const tags: string[] = modelMetadata.tags.map((item: string) => '@' + item);

                if (modelMetadata.isArray || modelMetadata.type.name === 'Array') {
                    requiredString = '';
                }

                // Process any database-specific options from the metadata
                const dbSpecificTags = this.processTypeOptions(modelMetadata, dbType);
                tags.push(...dbSpecificTags);

                section += `\t${key} ${DbHelper.toConfigCase(modelMetadata, dbType)}${requiredString} ${tags.join(' ')}\n`;
            }
        }

        section += '}\n';
        return section;
    }



    static toConfigCase(modelType: IMetaOpts, dbType: string = 'mongodb'): string {
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

    // Counter for generating unique relation names


    /**
     * Get a unique counter for a relation between two models
     * @param relationKey A unique key for the relation
     * @returns A unique counter for this relation
     */
    static getRelationCounter(relationKey: string, inverse: boolean = false): number {
        let counter = 0;            

        for(const relationInfo of this.allRelations.get(relationKey)) {            
            if((relationInfo.base === true && !inverse) || (relationInfo.inversion === true && inverse) ){                
                counter++;
            }            
        };

        return counter;
    }

    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata: IMetaOpts, dbType: string): string[] {
        const tags: string[] = [...(metadata.tags || [])];

        // Extract any database-specific options from the metadata
        // and convert them to appropriate Prisma schema tags
        if (metadata.dbOptions) {
            // Handle MySQL-specific options
            if (dbType === 'mysql' && metadata.dbOptions.mysql) {
                if (metadata.dbOptions.mysql.useText) {
                    tags.push('db.Text');
                } else if (metadata.dbOptions.mysql.maxLength) {
                    tags.push(`db.VarChar(${metadata.dbOptions.mysql.maxLength})`);
                }

                if (metadata.dbOptions.mysql.useUuid && metadata.tags?.includes('id')) {
                    tags.push('default(uuid())');
                }
            }

            // Handle PostgreSQL-specific options
            if ((dbType === 'postgresql' || dbType === 'postgres') && metadata.dbOptions.postgres) {
                if (metadata.dbOptions.postgres.useText) {
                    tags.push('db.Text');
                }

                if (metadata.dbOptions.postgres.useUuid && metadata.tags?.includes('id')) {
                    tags.push('default(uuid())');
                    tags.push('db.Uuid');
                }
            }

            // Handle MongoDB-specific options
            if (dbType === 'mongodb' && metadata.dbOptions.mongodb) {
                if (metadata.dbOptions.mongodb.customType) {
                    tags.push(`db.${metadata.dbOptions.mongodb.customType}`);
                }
            }
        }

        return tags;
    }
}
