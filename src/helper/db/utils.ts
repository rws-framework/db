import { rwsPath } from '@rws-framework/console';
import path from 'path';
import fs from 'fs';
import { IDbConfigParams } from '../../types/DbConfigHandler';
import { IIdMetaOpts, IIdTypeOpts } from '../../decorators/IdType';
import { TypeConverter } from './type-converter';
import { IDbOpts } from '../../models/interfaces/IDbOpts';

const workspaceRoot = rwsPath.findRootWorkspacePath();
const moduleDir = path.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');

/**
 * Utility functions for database operations
 */
export class DbUtils {
    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir(): [string, string] {
        const schemaDir = path.join(moduleDir, 'prisma');
        const schemaPath = path.join(schemaDir, 'schema.prisma');

        return [schemaDir, schemaPath];
    }

    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller(): string {
        if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {
            return 'yarn';
        }

        return 'npx';
    }

    /**
     * Generate an ID field based on the database type
     */
    static generateId(
        dbType: IDbConfigParams['db_type'],
        modelMeta: Record<string, { annotationType: string, metadata: IIdMetaOpts }>,
        optional = false
    ): string {        
        let useUuid = false;
        let field = 'id';
        const tags: string[] = [];        

        for (const key in modelMeta) {
            const modelMetadata: IIdMetaOpts = modelMeta[key].metadata;            
            const annotationType: string = modelMeta[key].annotationType;            

            if(key !== 'id'){
                if(annotationType == 'IdType'){     
                    const dbSpecificTags = TypeConverter.processTypeOptions({ tags: [], dbOptions: modelMetadata.dbOptions }, dbType);
                    tags.push(...dbSpecificTags);                 
                             
                    field = key;

                    if(modelMetadata.dbOptions?.mysql?.useUuid){
                        useUuid = true;
                    }

                    if(modelMetadata.dbOptions?.postgres?.useUuid){
                        useUuid = true;
                    }

                    if(modelMetadata.type.name === 'String'){
                        useUuid = true;
                    }
                }
            }
        }

        let idString: string;
        
        let reqStr = '';

        if(optional){
            reqStr = '?';
        }

        switch (dbType) {
            case 'mongodb':
                idString = `${field} String${reqStr} @id @default(auto()) @map("_id") @db.ObjectId`;
                break;

            case 'mysql':
                idString = useUuid
                    ? `${field} String${reqStr} @id @default(uuid())`
                    : `${field} Int${reqStr} @id @default(autoincrement())`;
                break;

            case 'postgresql':
            case 'postgres':
                idString = useUuid
                    ? `${field} String${reqStr} @id @default(uuid())`
                    : `${field} Int${reqStr} @id @default(autoincrement())`;
                    break;    

            case 'sqlite':
                idString = `${field} Int${reqStr} @id @default(autoincrement())`;            
                break;
        }        

        if(tags.length){
            idString += ' '+tags.join(' ');
        }

        if(!idString){
            throw new Error(`DB type "${dbType}" is not supported!`);
        }


        return idString;
    }
}

export const workspaceRootPath = workspaceRoot;
export const moduleDirPath = moduleDir;
