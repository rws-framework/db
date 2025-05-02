"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbHelper = void 0;
const console_1 = require("@rws-framework/console");
const db_1 = require("./db");
/**
 * Database helper class
 *
 * This class provides a facade for the database helper modules.
 * It delegates to the specialized modules for specific functionality.
 */
class DbHelper {
    /**
     * Install Prisma with the generated schema
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async installPrisma(configService, dbService, leaveFile = false) {
        return db_1.SchemaGenerator.installPrisma(configService, dbService, leaveFile);
    }
    /**
     * Push database models to the database
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async pushDBModels(configService, dbService, leaveFile = false) {
        return db_1.SchemaGenerator.pushDBModels(configService, dbService, leaveFile);
    }
    static async migrateDBModels(configService, dbService, leaveFile = false) {
        process.env = { ...process.env, [this.dbUrlVarName]: configService.get('db_url') };
        const [_, schemaPath] = db_1.DbUtils.getSchemaDir();
        await console_1.rwsShell.runCommand(`${db_1.DbUtils.detectInstaller()} prisma migrate dev --create-only --schema=${schemaPath}`, process.cwd());
    }
    /**
     * Generate model sections for the schema
     * @param model The model to generate a section for
     * @param configService The configuration service
     * @returns The model section
     */
    static async generateModelSections(model, configService) {
        return db_1.SchemaGenerator.generateModelSections(model, configService);
    }
    /**
     * Generate the base schema for Prisma
     * @param dbType The database type
     * @param dbUrl The database URL
     * @returns The base schema
     */
    static generateBaseSchema(dbType, dbUrl) {
        return db_1.SchemaGenerator.generateBaseSchema(dbType, dbUrl);
    }
    /**
     * Get the directory and path for the Prisma schema file
     */
    static getSchemaDir() {
        return db_1.DbUtils.getSchemaDir();
    }
    /**
     * Detect the package installer (yarn or npx)
     */
    static detectInstaller() {
        return db_1.DbUtils.detectInstaller();
    }
    /**
     * Generate an ID field based on the database type
     */
    static generateId(dbType, modelMeta) {
        return db_1.DbUtils.generateId(dbType, modelMeta);
    }
    /**
     * Convert a JavaScript type to a Prisma schema type
     */
    static toConfigCase(modelType, dbType = 'mongodb') {
        return db_1.TypeConverter.toConfigCase(modelType, dbType);
    }
    /**
     * Process type functions metadata to extract database-specific options
     */
    static processTypeOptions(metadata, dbType) {
        return db_1.TypeConverter.processTypeOptions(metadata, dbType);
    }
    /**
     * Mark a relation between two models
     */
    static markRelation(relationKey, inverse = false) {
        db_1.RelationManager.markRelation(relationKey, inverse);
    }
    /**
     * Complete a relation between two models
     */
    static completeRelation(relationKey, index, inverse = false) {
        db_1.RelationManager.completeRelation(relationKey, index, inverse);
    }
    /**
     * Get a unique counter for a relation between two models
     */
    static getRelationCounter(relationKey, inverse = false) {
        return db_1.RelationManager.getRelationCounter(relationKey, inverse);
    }
    /**
     * Generate a shortened relation name to stay within database limits
     */
    static getShortenedRelationName(modelName, relatedModelName, index) {
        return db_1.RelationManager.getShortenedRelationName(modelName, relatedModelName, index);
    }
}
exports.DbHelper = DbHelper;
/**
 * The environment variable name for the Prisma database URL
 */
DbHelper.dbUrlVarName = db_1.SchemaGenerator.dbUrlVarName;
