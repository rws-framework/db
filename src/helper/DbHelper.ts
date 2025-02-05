import { rwsShell, rwsPath } from '@rws-framework/console';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';

import { IDbConfigHandler } from '../types/DbConfigHandler';
import { IMetaOpts, OpModelType, RWSModel } from '../models/_model';
import TimeSeriesModel from '../models/TimeSeriesModel';
import { DBService } from '../services/DBService';

const log = console.log;
const workspaceRoot = rwsPath.findRootWorkspacePath();
const moduleDir = path.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');

export class DbHelper {
    static async installPrisma(configService: IDbConfigHandler, dbService: DBService, leaveFile = false): Promise<void>
    {
        const dbUrl = configService.get('mongo_url');      
        const dbType = 'mongodb';

        let template: string = `generator client {\n
        provider = "prisma-client-js"\n
    }\n\n`;

        template += `\ndatasource db {\n
        provider = "${dbType}"\n
        url = env("DATABASE_URL")\n    
    }\n\n`;

        const dbModels: OpModelType<unknown>[] | null = configService.get('db_models');       

        if(dbModels){

            for (const model of dbModels){ 
                const modelSection = await DbHelper.generateModelSections(model);

                template += '\n\n' + modelSection;  

                log('RWS SCHEMA BUILD', chalk.blue('Building DB Model'), model.name);
            
                if(RWSModel.isSubclass(model as any, TimeSeriesModel)){    
                    dbService.collectionExists(model._collection).then((exists: boolean) => {
                        if (exists){
                            return;
                        }

                        log(chalk.green('[RWS Init]') + ` creating TimeSeries type collection from ${model} model`);

                        dbService.createTimeSeriesCollection(model._collection);    
                    });
                }
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
            await rwsShell.runCommand(`${endPrisma} generate --schema=${schemaPath}`, process.cwd());  

            // leaveFile = true;
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
            const modelMetadata: IMetaOpts = modelMetadatas[key].metadata;            
            const requiredString = modelMetadata.required ? '' : '?';  
            const annotationType: string = modelMetadatas[key].annotationType;
    
            if(key === 'id'){
                continue;
            }
            
            if(annotationType === 'Relation'){
                const relatedModel = modelMetadata.relatedTo as OpModelType<any>;        
                // Handle direct relation (many-to-one or one-to-one)
                section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${modelName}_${relatedModel._collection}", fields: [${modelMetadata.relationField}], references: [${modelMetadata.relatedToField}], onDelete: Cascade)\n`;      
                section += `\t${modelMetadata.relationField} String${requiredString} @db.ObjectId\n`;
            } else if (annotationType === 'InverseRelation'){        
                // Handle inverse relation (one-to-many or one-to-one)
                section += `\t${key} ${modelMetadata.inversionModel._collection}[] @relation("${modelMetadata.inversionModel._collection}_${modelName}")\n`;
            } else if (annotationType === 'InverseTimeSeries'){        
                section += `\t${key} String[] @db.ObjectId\n`;      
            } else if (annotationType === 'TrackType'){        
                const tags: string[] = modelMetadata.tags.map((item: string) => '@' + item);          
                section += `\t${key} ${DbHelper.toConfigCase(modelMetadata)}${requiredString} ${tags.join(' ')}\n`;
            }
        }
        
        section += '}\n';
        return section;
    }
    
    static toConfigCase(modelType: any): string {
        const type = modelType.type;
        const input = type.name;  
    
        if(input == 'Number'){
            return 'Int';
        }
    
        if(input == 'Object'){
            return 'Json';
        }
    
        if(input == 'Date'){
            return 'DateTime';
        }
    
    
        const firstChar = input.charAt(0).toUpperCase();
        const restOfString = input.slice(1);
        return firstChar + restOfString;
    }
}