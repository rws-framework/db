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
        var _a, _b, _c, _d;
        let useUuid = false;
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
                    if ((_b = (_a = modelMetadata.dbOptions) === null || _a === void 0 ? void 0 : _a.mysql) === null || _b === void 0 ? void 0 : _b.useUuid) {
                        useUuid = true;
                    }
                    if ((_d = (_c = modelMetadata.dbOptions) === null || _c === void 0 ? void 0 : _c.postgres) === null || _d === void 0 ? void 0 : _d.useUuid) {
                        useUuid = true;
                    }
                    if (modelMetadata.type.name === 'String') {
                        useUuid = true;
                    }
                }
            }
        }
        let idString;
        let reqStr = '';
        if (optional) {
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
        if (tags.length) {
            idString += ' ' + tags.join(' ');
        }
        if (!idString) {
            throw new Error(`DB type "${dbType}" is not supported!`);
        }
        return idString;
    }
}
exports.DbUtils = DbUtils;
exports.workspaceRootPath = workspaceRoot;
exports.moduleDirPath = moduleDir;
