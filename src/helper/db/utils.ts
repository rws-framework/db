import { rwsPath } from '@rws-framework/console';
import path from 'path';
import fs from 'fs';
import { IDbConfigParams } from '../../types/DbConfigHandler';
import { IIdMetaOpts, IIdTypeOpts } from '../../decorators/IdType';
import { TypeConverter } from './type-converter';
import { IDbOpts } from '../../models/interfaces/IDbOpts';
import { ITrackerMetaOpts } from '../../models/_model';

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

    static getProcessedSchemaDir(): [string, string] {
        const schemaDir = path.join(workspaceRoot, 'node_modules','.prisma', 'client');
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
        let useUuid = this.doesUseUuid(modelMeta);
        let field = 'id';
        const tags: string[] = [];        

        for (const key in modelMeta) {
            const modelMetadata: IIdMetaOpts = modelMeta[key].metadata;
            const annotationType: string = modelMeta[key].annotationType;

            if (key !== 'id') {
                if (annotationType == 'IdType') {
                    const dbSpecificTags = TypeConverter.processTypeOptions({ tags: [], dbOptions: modelMetadata.dbOptions }, dbType);
                    tags.push(...dbSpecificTags);

                    field = key;                   
                }
            }
        }

        const idPrismaType = this.getDefaultPrismaType(dbType, useUuid);
      
        let reqStr = '';

        if (optional) {
            reqStr = '?';
        }

        let idString: string = `${field} ${idPrismaType}${reqStr}`;

        idString += this.addIdPart(dbType, useUuid, modelMeta[field].metadata.noAuto);

        // if(dbType === 'mongodb'){
        //     tags.push('@map("_id")');
        //     tags.push('@db.ObjectId');
        // }

        if (tags.length) {
            idString += ' ' + tags.join(' ');
        }

        if (!idString) {
            throw new Error(`DB type "${dbType}" is not supported!`);
        }


        return idString;
    }

    static getDefaultPrismaType(dbType: IDbConfigParams['db_type'], useUuid: boolean): string 
    {
        let idPrismaType = 'String';

        switch (dbType) {
            case 'mysql':
                if (useUuid) {
                    idPrismaType = 'String';
                } else {
                    idPrismaType = 'Int';
                }

                break;

            case 'postgresql':
            case 'postgres':
                if (useUuid) {
                    idPrismaType = 'String';
                } else {
                    idPrismaType = 'Int';
                }

                break;

            case 'sqlite':
                if (useUuid) {
                    idPrismaType = 'String';
                } else {
                    idPrismaType = 'Int';
                }

                break;
        }

        return idPrismaType;
    }

    static doesUseUuid(modelMeta: Record<string, { annotationType: string, metadata: IIdMetaOpts }>): boolean
    {
        let useUuid = false;
       
        for (const key in modelMeta) {
            const modelMetadata: IIdMetaOpts = modelMeta[key].metadata;
            const annotationType: string = modelMeta[key].annotationType;

            if (key !== 'id') {
                if (annotationType == 'IdType') {                                      
                    if (modelMetadata.dbOptions?.mysql?.useUuid) {
                        useUuid = true;
                    }

                    if (modelMetadata.dbOptions?.postgres?.useUuid) {
                        useUuid = true;
                    }

                    if (modelMetadata.type.name === 'String') {
                        useUuid = true;
                    }
                }
            }
        }

        return useUuid;
    }

    static addIdPart(dbType: IDbConfigParams['db_type'], useUuid: boolean, noAuto: boolean = false): string
    { 
        let idString = ` @id${!noAuto ? ` @default(${this.generateIdDefault(dbType, useUuid)})` : ''}`;

        if(dbType === 'mongodb'){
            idString += ' @map("_id")';
            idString += ' @db.ObjectId';            
        }

        return idString;
    }

    static generateIdDefault(dbType: IDbConfigParams['db_type'], useUuid: boolean): string
    {        
        switch (dbType) {
            case 'mongodb':
                return `auto()`;                

            case 'mysql':
                return useUuid
                    ? `uuid()`
                    : `autoincrement()`;                

            case 'postgresql':
            case 'postgres':
                return useUuid
                    ? `uuid()`
                    : `autoincrement()`;                

            case 'sqlite':
                return 'autoincrement()';
        }
    }
}

export const workspaceRootPath = workspaceRoot;
export const moduleDirPath = moduleDir;
