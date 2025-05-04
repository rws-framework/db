import { rwsShell } from '@rws-framework/console';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { IDbConfigHandler } from '../../types/DbConfigHandler';
import { OpModelType, RWSModel } from '../../models/_model';
import { DBService } from '../../services/DBService';
import { IRelationOpts } from '../../decorators/Relation';
import { InverseRelationOpts } from '../../decorators/InverseRelation';

import { DbUtils } from './utils';
import { TypeConverter } from './type-converter';
import { RelationManager } from './relation-manager';
import { ITrackerMetaOpts } from '../../decorators/TrackType';
import { IDbOpts } from '../../models/interfaces/IDbOpts';

const _EXECUTE_PRISMA_CMD = true;
const _REMOVE_SCHEMA_FILE = true;

/**
 * Handles Prisma schema generation
 */
export class SchemaGenerator {
    static dbUrlVarName: string = 'PRISMA_DB_URL';

    /**
     * Generate the base schema for Prisma
     * @param dbType The database type
     * @param dbUrl The database URL
     * @returns The base schema
     */
    static generateBaseSchema(dbType: string, dbUrl: string): string {
        process.env = { ...process.env, [this.dbUrlVarName]: dbUrl };

        return `generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "${dbType}"
    url = env("${this.dbUrlVarName}")
}`;
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
        let section = '';
        const modelMetadatas: Record<string, { annotationType: string, metadata: any }> = await RWSModel.getModelAnnotations(model);
        const dbType = configService.get('db_type') || 'mongodb';
        const modelName: string = (model as any)._collection;

        section += `model ${modelName} {\n`;               

        let hasIdType = false;  
        let idFieldName: string;

        for(const someModelMetaKey in modelMetadatas){
            const isIdTyped = modelMetadatas[someModelMetaKey].annotationType === 'IdType';
            if(isIdTyped){
                hasIdType = true;
                idFieldName = someModelMetaKey;
            }
        }

        let idGenerated = false;      
            

        if(
            !model._NO_ID && !hasIdType            
        ){                     
            section += `\t${DbUtils.generateId(dbType, modelMetadatas)}\n`;     
            idGenerated = true;
        }                        

        for (const key in modelMetadatas) {
            const modelMetadata = modelMetadatas[key].metadata;
            let requiredString = modelMetadata.required ? '' : '?';
            const annotationType: string = modelMetadatas[key].annotationType;

            let indexedId = false;

            if(model._NO_ID || hasIdType){
                indexedId = true;
                requiredString = '';
            }                         

            if (key === 'id' && !indexedId) {
                continue;
            }
              
            if (annotationType === 'Relation') {
                const relationMeta = modelMetadata as IRelationOpts;

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
                
                const relationIndex = RelationManager.getRelationCounter(relationKey);
                const relationName = relationMeta.relationName ? relationMeta.relationName : null;

                const mapName = relationMeta.mappingName ? relationMeta.mappingName : null; 

                const relatedModelMetadatas: Record<string, { annotationType: string, metadata: ITrackerMetaOpts }> = await RWSModel.getModelAnnotations(relatedModel);
                const relationFieldName = modelMetadata.relationField ? modelMetadata.relationField  : key.toLowerCase() + '_' + modelMetadata.relationField.toLowerCase();

                const relatedToField = modelMetadata.relatedToField || 'id';
                const bindingFieldExists = !!modelMetadatas[relationFieldName];  
                
                if(modelMetadata.required === false){
                    requiredString = '?';
                }               

                const cascadeStr = cascadeOpts.length ? `, ${cascadeOpts.join(', ')}` : '' ;

                if (isMany) {
                    // Add an inverse field to the related model if it doesn't exist
                    section += `\t${key} ${relatedModel._collection}[] @relation(${relationName ? `"${relationName}", ` : ''}fields: [${relationFieldName}], references: [${relatedToField}]${mapName ? `, map: "${mapName}"` : ''}${cascadeStr})\n`;
                } else {                             
                    section += `\t${key} ${relatedModel._collection}${requiredString} @relation(${relationName ? `"${relationName}", ` : ''}fields: [${relationFieldName}], references: [${relatedToField}]${mapName ? `, map: "${mapName}"` : ''}${cascadeStr})\n`;
                    if(!bindingFieldExists){
                        const relatedFieldMeta = relatedModelMetadatas[relatedToField];

                        if(!relatedFieldMeta.metadata.required){                     
                            requiredString = '';
                        }
                        
                        let relatedFieldType = TypeConverter.toConfigCase(relatedFieldMeta.metadata, dbType, true);
        
                        if(relatedToField === 'id' && dbType !== 'mongodb'){
                            relatedFieldType = 'Int';
                        }                                       
                    
                        // Add relation field with appropriate type based on database
                        if (dbType === 'mongodb') {
                            section += `\t${relationFieldName} String${requiredString} @db.ObjectId\n`;
                        } else if (dbType === 'mysql') {
                            // For MySQL, determine the type based on the related model's ID type
                            section += `\t${relationFieldName} ${relatedFieldType}${requiredString}\n`;
                        } else if (dbType === 'postgresql' || dbType === 'postgres') {
                            if (relatedFieldType === 'String') {
                                section += `\t${relationFieldName} ${relatedFieldType}${requiredString} @db.Uuid\n`;
                            } else {
                                section += `\t${relationFieldName} ${relatedFieldType}${requiredString}\n`;
                            }
                        } else {                        
                            section += `\t${relationFieldName} String${requiredString}\n`;
                        }
                    }
                }

                RelationManager.completeRelation(relationKey, relationIndex);
            } else if (annotationType === 'InverseRelation') {
                const relationMeta = modelMetadata as InverseRelationOpts;

                // Check if we need a custom relation name (if there are multiple relations to the same model)
                const relatedModelName = relationMeta.inversionModel._collection;

                // Generate a very short relation name using a counter
                // Use a consistent key for both sides of the relation to ensure the same name is used
                const relationKey = [relatedModelName, modelName].join('_');
                const relationIndex = RelationManager.getRelationCounter(relationKey, true);

                const relationName = RelationManager.getShortenedRelationName(relatedModelName, modelName, relationIndex);                

                let relationTag = '';

                if(relationMeta.relationName){
                    relationTag = ` @relation("${relationMeta.relationName}")`;
                }

                section += `\t${key} ${relationMeta.inversionModel._collection}[]${relationTag}\n`;
                
                RelationManager.completeRelation(relationKey, relationIndex, true);
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
            } else {
                const trackMeta = modelMetadata as ITrackerMetaOpts;
                const trackTags = trackMeta.tags || [];
                const tags: string[] = trackTags.map((item: string) => '@' + item);  
                             
                const isNoIdBehavior = model._NO_ID || idFieldName;
                const isOverrideBehavior = (hasIdType && annotationType === 'IdType' && key === 'id' && idFieldName === 'id') 
                    || 
                    (model._NO_ID && model._SUPER_TAGS.some(a => a.fields.includes('id')) && key === 'id');
                                                                
                if(key === 'id' && 
                    isNoIdBehavior && !isOverrideBehavior               
                ){                  
                    continue;
                }

                if(trackMeta.unique){
                    const fieldDetail: string | null = typeof trackMeta.unique === 'string' ? trackMeta.unique : null;
                    tags.push(`@unique(${fieldDetail ? `map: "${fieldDetail}"` : ''})`);
                }

                if(!trackMeta.required){
                    requiredString = '?';
                }

                if (trackMeta.isArray || trackMeta.type.name === 'Array') {
                    requiredString = '';
                }

                if(model._SUPER_TAGS.some(tag => tag.tagType === 'id' && tag.fields.includes(key))){
                    requiredString = '';
                }
               
                // Process any database-specific options from the metadata
                const dbSpecificTags = TypeConverter.processTypeOptions(trackMeta as { tags: string[], dbOptions: IDbOpts['dbOptions'] }, dbType);
                tags.push(...dbSpecificTags);
         
                const isIdTypeField = modelMetadatas[key].annotationType === 'IdType';                         
                const fieldInUniqueSuperTag = model._SUPER_TAGS.some(st => st.tagType === 'unique' && st.fields.includes(key));

                if(isIdTypeField){
                    requiredString = '';
                }        

                let trackField = `${key} ${TypeConverter.toConfigCase(trackMeta, dbType, key === 'id', isOverrideBehavior)}${requiredString} ${tags.join(' ')}`;

                if(isIdTypeField){
                    trackField += DbUtils.addIdPart(dbType, DbUtils.doesUseUuid(modelMetadatas), trackMeta.noAuto);
                    idGenerated = true;                                   
                }          

                section += `\t${trackField}\n`;
            }
        }

        if(model._SUPER_TAGS.length){
            section += '\n';
        }

        for(const superTag of model._SUPER_TAGS){

            const mapStr = superTag.map ? `, map: "${superTag.map}"` : '';

            const superFields = [];
        
            for(const superField of superTag.fields){
                const fieldMetadata = modelMetadatas[superField]['metadata'];
       
    
                let pushed = false;

                if(fieldMetadata.dbOptions && fieldMetadata.dbOptions.mysql && fieldMetadata.dbOptions.mysql.useType){                        
                    switch(fieldMetadata.dbOptions.mysql.useType){
                        case 'db.LongText': 
                            superFields.push(`${superField}(length: 255)`);                                    
                            pushed = true;
                        break;
                    }                    
                }

                if(!pushed){
                    superFields.push(superField);
                }
            }
            
            section += `\t@@${superTag.tagType}([${superFields.join(', ')}]${mapStr})\n`;
        }

        section += '}\n';
        return section;
    }

    /**
     * Install Prisma with the generated schema
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void> {
        const dbUrl = configService.get('db_url');
        const dbType = configService.get('db_type') || 'mongodb';

        let template: string = this.generateBaseSchema(dbType, dbUrl);

        const dbModels: OpModelType<unknown>[] | null = configService.get('db_models');

        if (dbModels) {   
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

                        // Add this relation to the map
                        RelationManager.markRelation(relationKey);                                  
                    }
                    
                    if(annotationType === 'InverseRelation'){
                        const relationMeta = modelMetadatas[key].metadata as InverseRelationOpts;
                        const relatedModel = relationMeta.inversionModel as OpModelType<any>;
                        
                        const relatedModelName = relatedModel._collection;
            
                        const relationKey = [relatedModelName, modelName].join('_');                      
                        RelationManager.markRelation(relationKey, true);
                    }
                }
            }            

            // Now generate the model sections with all relations
            for (const model of dbModels) {
                const modelSection = await SchemaGenerator.generateModelSections(model, configService);

                template += '\n\n' + modelSection;

                console.log(chalk.green('[RWS]'), chalk.blue('Building DB Model'), model.name);
            }

            const [schemaDir, schemaPath] = DbUtils.getSchemaDir();

            if (!fs.existsSync(schemaDir)) {
                fs.mkdirSync(schemaDir);
            }

            if (fs.existsSync(schemaPath)) {
                fs.unlinkSync(schemaPath);
            }

            fs.writeFileSync(schemaPath, template);

            if(_EXECUTE_PRISMA_CMD)
            await rwsShell.runCommand(`${DbUtils.detectInstaller()} prisma generate --schema=${schemaPath}`, process.cwd());

            
            console.log(chalk.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);

            if (_REMOVE_SCHEMA_FILE) {
                fs.unlinkSync(schemaPath);
            }
        }
    }

    /**
     * Push database models to the database
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async pushDBModels(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void> {
        process.env = { ...process.env, [this.dbUrlVarName]: configService.get('db_url') };

        const [_, schemaPath] = DbUtils.getSchemaDir();

        await rwsShell.runCommand(`${DbUtils.detectInstaller()} prisma db push --schema=${schemaPath}`, process.cwd());
    }
}
