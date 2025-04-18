import { rwsShell, rwsPath } from '@rws-framework/console';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IMetaOpts, OpModelType, RWSModel } from '../models/_model';
// import TimeSeriesModel from '../models/core/TimeSeriesModel';
import { DBService } from '../services/DBService';
import { IRelationOpts } from '../decorators/Relation';
import { InverseRelationOpts } from '../decorators/InverseRelation';

const log = console.log;
const workspaceRoot = rwsPath.findRootWorkspacePath();
const moduleDir = path.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');

export class DbHelper {
    static async installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void>
    {
        const dbUrl = configService.get('db_url');      
        const dbType = configService.get('db_type') || 'mongodb';

        let template: string = `generator client {\n
        provider = "prisma-client-js"\n
    }\n\n`;

        template += `\ndatasource db {\n
        provider = "${dbType}"\n
        url = env("PRISMA_DB_URL")\n
    }\n\n`;

        const dbModels: OpModelType<unknown>[] | null = configService.get('db_models');       

        if(dbModels){

            for (const model of dbModels){ 
                const modelSection = await DbHelper.generateModelSections(model);

                template += '\n\n' + modelSection;  

                log(chalk.green('[RWS]'), chalk.blue('Building DB Model'), model.name);
            
                // if(RWSModel.isSubclass(model as any, TimeSeriesModel)){    
                //     dbService.collectionExists(model._collection).then((exists: boolean) => {
                //         if (exists){
                //             return;
                //         }

                //         log(chalk.green('[RWS Init]') + ` creating TimeSeries type collection from ${model} model`);

                //         dbService.createTimeSeriesCollection(model._collection);    
                //     });
                // }
            }

            const schemaDir = path.join(moduleDir, 'prisma');
            const schemaPath = path.join(schemaDir, 'schema.prisma');

            if(!fs.existsSync(schemaDir)){
                fs.mkdirSync(schemaDir);
            }

            if(fs.existsSync(schemaPath)){
                fs.unlinkSync(schemaPath);
            }            

            fs.writeFileSync(schemaPath, template);  
            process.env.DB_URL = dbUrl;
            const endPrisma = 'npx prisma';

            // console.log({cwd: process.cwd()})
            // const clientPath = path.join(rwsPath.findRootWorkspacePath(), 'node_modules', '.prisma', 'client');
            await rwsShell.runCommand(`${endPrisma} generate --schema=${schemaPath}`, process.cwd());  

            leaveFile = false;
            log(chalk.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);

            if(!leaveFile){
                fs.unlinkSync(schemaPath);
            }    
        }
    }

    static async generateModelSections(model: OpModelType<any>): Promise<string> {
        let section = '';
        const modelMetadatas: Record<string, {annotationType: string, metadata: any}> = await RWSModel.getModelAnnotations(model);    
    
        const modelName: string = (model as any)._collection;
        
        section += `model ${modelName} {\n`;
        section += '\tid String @map("_id") @id @default(auto()) @db.ObjectId\n';
     
        for (const key in modelMetadatas) {
            const modelMetadata = modelMetadatas[key].metadata;            
            let requiredString = modelMetadata.required ? '' : '?';  
            const annotationType: string = modelMetadatas[key].annotationType;
    
            if(key === 'id'){
                continue;
            }

            
            if(annotationType === 'Relation'){
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
      
                if (isMany) {
                    // Handle many-to-many or one-to-many relation
                    section += `\t${key} ${relatedModel._collection}[] @relation("${modelName}_${relatedModel._collection}")\n`;
                } else {
                    // Handle one-to-one or many-to-one relation
                    section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${modelName}_${relatedModel._collection}", fields: [${modelMetadata.relationField}], references: [${modelMetadata.relatedToField || 'id'}], ${cascadeOpts.join(', ')})\n`;
                    section += `\t${modelMetadata.relationField} String${requiredString} @db.ObjectId\n`;
                }
            } else if (annotationType === 'InverseRelation'){   
                const relationMeta = modelMetadata as InverseRelationOpts;
     
                // Handle inverse relation (one-to-many or one-to-one)
                section += `\t${key} ${relationMeta.inversionModel._collection}[] @relation("${ relationMeta.relationName ? relationMeta.relationName : `${relationMeta.inversionModel._collection}_${modelName}`}")\n`;
            } else if (annotationType === 'InverseTimeSeries'){        
                section += `\t${key} String[] @db.ObjectId\n`;      
            } else if (annotationType === 'TrackType'){        
                const tags: string[] = modelMetadata.tags.map((item: string) => '@' + item);             

                if(modelMetadata.isArray || modelMetadata.type.name === 'Array'){
                    requiredString = '';
                }       
                section += `\t${key} ${DbHelper.toConfigCase(modelMetadata)}${requiredString} ${tags.join(' ')}\n`;
            }
        }
        
        section += '}\n';
        return section;
    }
    
    static toConfigCase(modelType: IMetaOpts): string {
        const type = modelType.type;
        let input = type.name;    
        
    
        if(input == 'Number'){
            input = 'Int';
        }
    
        if(input == 'Object'){
            input = 'Json';
        }
    
        if(input == 'Date'){
            input = 'DateTime';
        }

        if(input == 'Array'){
            input = 'Json[]';
        }
    
        const firstChar = input.charAt(0).toUpperCase();
        const restOfString = input.slice(1);
        let resultField = firstChar + restOfString;

        if(modelType.isArray){
            resultField += '[]';
        }

        return resultField;
    }
}