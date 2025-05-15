"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleDirPath = exports.workspaceRootPath = exports.DbUtils = void 0;
const console_1 = require("@rws-framework/console");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const type_converter_1 = require("./type-converter");
const workspaceRoot = console_1.rwsPath.findRootWorkspacePath();
const moduleDir = path_1.default.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');
/**
 * Utility functions for database operations
 */
class DbUtils {
    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir() {
        const schemaDir = path_1.default.join(moduleDir, 'prisma');
        const schemaPath = path_1.default.join(schemaDir, 'schema.prisma');
        return [schemaDir, schemaPath];
    }
    static getProcessedSchemaDir() {
        const schemaDir = path_1.default.join(workspaceRoot, 'node_modules', '.prisma', 'client');
        const schemaPath = path_1.default.join(schemaDir, 'schema.prisma');
        return [schemaDir, schemaPath];
    }
    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller() {
        if (fs_1.default.existsSync(path_1.default.join(workspaceRoot, 'yarn.lock'))) {
            return 'yarn';
        }
        return 'npx';
    }
    /**
     * Generate an ID field based on the database type
     */
    static generateId(dbType, modelMeta, optional = false) {
        let useUuid = this.doesUseUuid(modelMeta);
        let field = 'id';
        const tags = [];
        for (const key in modelMeta) {
            const modelMetadata = modelMeta[key].metadata;
            const annotationType = modelMeta[key].annotationType;
            if (key !== 'id') {
                if (annotationType == 'IdType') {
                    const dbSpecificTags = type_converter_1.TypeConverter.processTypeOptions({ tags: [], dbOptions: modelMetadata.dbOptions }, dbType);
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
        let idString = `${field} ${idPrismaType}${reqStr}`;
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
    static getDefaultPrismaType(dbType, useUuid) {
        let idPrismaType = 'String';
        switch (dbType) {
            case 'mysql':
                if (useUuid) {
                    idPrismaType = 'String';
                }
                else {
                    idPrismaType = 'Int';
                }
                break;
            case 'postgresql':
            case 'postgres':
                if (useUuid) {
                    idPrismaType = 'String';
                }
                else {
                    idPrismaType = 'Int';
                }
                break;
            case 'sqlite':
                if (useUuid) {
                    idPrismaType = 'String';
                }
                else {
                    idPrismaType = 'Int';
                }
                break;
        }
        return idPrismaType;
    }
    static doesUseUuid(modelMeta) {
        let useUuid = false;
        for (const key in modelMeta) {
            const modelMetadata = modelMeta[key].metadata;
            const annotationType = modelMeta[key].annotationType;
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
    static addIdPart(dbType, useUuid, noAuto = false) {
        let idString = ` @id${!noAuto ? ` @default(${this.generateIdDefault(dbType, useUuid)})` : ''}`;
        if (dbType === 'mongodb') {
            idString += ' @map("_id")';
            idString += ' @db.ObjectId';
        }
        return idString;
    }
    static generateIdDefault(dbType, useUuid) {
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
exports.DbUtils = DbUtils;
exports.workspaceRootPath = workspaceRoot;
exports.moduleDirPath = moduleDir;
