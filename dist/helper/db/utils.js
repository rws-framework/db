"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleDirPath = exports.workspaceRootPath = exports.DbUtils = void 0;
const console_1 = require("@rws-framework/console");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
    static generateId(dbType, options = {}) {
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
                throw new Error(`DB type "${dbType}" is not supported!`);
        }
    }
}
exports.DbUtils = DbUtils;
exports.workspaceRootPath = workspaceRoot;
exports.moduleDirPath = moduleDir;
