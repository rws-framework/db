"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbHelper = void 0;
const console_1 = require("@rws-framework/console");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const _model_1 = require("../models/_model");
const log = console.log;
const workspaceRoot = console_1.rwsPath.findRootWorkspacePath();
const moduleDir = path_1.default.resolve(workspaceRoot, 'node_modules', '@rws-framework', 'db');
class DbHelper {
    static async installPrisma(configService, dbService, leaveFile = false) {
        const dbUrl = configService.get('db_url');
        const dbType = configService.get('db_type') || 'mongodb';
        let template = this.generateBaseSchema(dbType, dbUrl);
        const dbModels = configService.get('db_models');
        if (dbModels) {
            for (const model of dbModels) {
                const modelName = model._collection;
                const modelMetadatas = await _model_1.RWSModel.getModelAnnotations(model);
                for (const key in modelMetadatas) {
                    const annotationType = modelMetadatas[key].annotationType;
                    if (annotationType === 'Relation') {
                        const relationMeta = modelMetadatas[key].metadata;
                        const relatedModel = relationMeta.relatedTo;
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
                    if (annotationType === 'InverseRelation') {
                        const relationMeta = modelMetadatas[key].metadata;
                        const relatedModel = relationMeta.inversionModel;
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
                log(chalk_1.default.green('[RWS]'), chalk_1.default.blue('Building DB Model'), model.name);
            }
            const [schemaDir, schemaPath] = this.getSchemaDir();
            if (!fs_1.default.existsSync(schemaDir)) {
                fs_1.default.mkdirSync(schemaDir);
            }
            if (fs_1.default.existsSync(schemaPath)) {
                fs_1.default.unlinkSync(schemaPath);
            }
            fs_1.default.writeFileSync(schemaPath, template);
            await console_1.rwsShell.runCommand(`${this.detectInstaller()} prisma generate --schema=${schemaPath}`, process.cwd());
            leaveFile = false;
            log(chalk_1.default.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);
            if (!leaveFile) {
                // fs.unlinkSync(schemaPath);
            }
        }
    }
    static getShortenedRelationName(modelName, relatedModelName, index) {
        const fullRelationName = `${modelName}_${relatedModelName}_${index}`.toLowerCase();
        if (fullRelationName.length <= 64) {
            return fullRelationName;
        }
        const extraChars = 2 + String(index).length;
        const availableChars = 64 - extraChars;
        const modelNameLength = modelName.length;
        const relatedModelNameLength = relatedModelName.length;
        const totalLength = modelNameLength + relatedModelNameLength;
        const modelNameMaxLength = Math.floor(availableChars * (modelNameLength / totalLength));
        const relatedModelNameMaxLength = availableChars - modelNameMaxLength;
        const shortenedModelName = modelName.substring(0, Math.max(3, modelNameMaxLength));
        const shortenedRelatedModelName = relatedModelName.substring(0, Math.max(3, relatedModelNameMaxLength));
        // Create the new relation name
        return `${shortenedModelName}_${shortenedRelatedModelName}_${index}`.toLowerCase();
    }
    static markRelation(relationKey, inverse = false) {
        if (!this.allRelations.has(relationKey)) {
            this.allRelations.set(relationKey, []);
        }
        const modelRelations = this.allRelations.get(relationKey);
        let marked = false;
        for (const relationInfo of modelRelations) {
            if ((relationInfo.base !== null && !inverse) || (relationInfo.inversion !== null && inverse)) {
                continue;
            }
            if (inverse) {
                relationInfo.inversion = false;
                marked = true;
            }
            else {
                relationInfo.base = false;
                marked = true;
            }
            return;
        }
        if (!marked) {
            modelRelations.push({ base: inverse ? null : false, inversion: inverse ? false : null });
        }
    }
    static completeRelation(relationKey, index, inverse = false) {
        const modelRelations = this.allRelations.get(relationKey);
        if (inverse) {
            modelRelations[index].inversion = true;
        }
        else {
            modelRelations[index].base = true;
        }
    }
    static generateBaseSchema(dbType, dbUrl) {
        process.env = { ...process.env, [this.dbUrlVarName]: dbUrl };
        return `generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "${dbType}"
    url = env("${this.dbUrlVarName}")
}`;
    }
    static getSchemaDir() {
        const schemaDir = path_1.default.join(moduleDir, 'prisma');
        const schemaPath = path_1.default.join(schemaDir, 'schema.prisma');
        return [schemaDir, schemaPath];
    }
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
                throw new Error('Kurwa, nieobsługiwany typ bazy danych!');
        }
    }
    static detectInstaller() {
        if (fs_1.default.existsSync(path_1.default.join(workspaceRoot, 'yarn.lock'))) {
            return 'yarn';
        }
        return 'npx';
    }
    static async pushDBModels(configService, dbService, leaveFile = false) {
        process.env = { ...process.env, [this.dbUrlVarName]: configService.get('db_url') };
        const schemaPath = path_1.default.join(workspaceRoot, 'node_modules', '.prisma', 'client', 'schema.prisma');
        await console_1.rwsShell.runCommand(`${this.detectInstaller()} prisma db push --schema=${schemaPath}`, process.cwd());
    }
    static async generateModelSections(model, configService) {
        var _a, _b;
        let section = '';
        const modelMetadatas = await _model_1.RWSModel.getModelAnnotations(model);
        const dbType = configService.get('db_type') || 'mongodb';
        const modelName = model._collection;
        section += `model ${modelName} {\n`;
        section += `\t${this.generateId(dbType)}\n`;
        for (const key in modelMetadatas) {
            const modelMetadata = modelMetadatas[key].metadata;
            let requiredString = modelMetadata.required ? '' : '?';
            const annotationType = modelMetadatas[key].annotationType;
            if (key === 'id') {
                continue;
            }
            if (annotationType === 'Relation') {
                const relationMeta = modelMetadata;
                const relatedModel = relationMeta.relatedTo;
                const isMany = relationMeta.many;
                const cascadeOpts = [];
                if ((_a = relationMeta.cascade) === null || _a === void 0 ? void 0 : _a.onDelete) {
                    cascadeOpts.push(`onDelete: ${relationMeta.cascade.onDelete}`);
                }
                if ((_b = relationMeta.cascade) === null || _b === void 0 ? void 0 : _b.onUpdate) {
                    cascadeOpts.push(`onUpdate: ${relationMeta.cascade.onUpdate}`);
                }
                const relatedModelName = relatedModel._collection;
                const relationKey = [modelName, relatedModelName].join('_');
                const relationIndex = this.getRelationCounter(relationKey);
                const relationName = this.getShortenedRelationName(modelName, relatedModelName, relationIndex);
                const mapName = relationName;
                if (isMany) {
                    // Add an inverse field to the related model if it doesn't exist
                    section += `\t${key} ${relatedModel._collection}[] @relation("${relationName}", map: "${mapName}")\n`;
                }
                else {
                    const relationFieldName = key.toLowerCase() + '_' + modelMetadata.relationField.toLowerCase();
                    section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${relationName}", fields: [${relationFieldName}], references: [${modelMetadata.relatedToField || 'id'}], map: "${mapName}", ${cascadeOpts.join(', ')})\n`;
                    // Add relation field with appropriate type based on database
                    if (dbType === 'mongodb') {
                        section += `\t${relationFieldName} String${requiredString} @db.ObjectId\n`;
                    }
                    else if (dbType === 'mysql') {
                        // For MySQL, determine the type based on the related model's ID type
                        const useUuid = relationMeta.useUuid || false;
                        if (useUuid) {
                            section += `\t${relationFieldName} String${requiredString}\n`;
                        }
                        else {
                            section += `\t${relationFieldName} Int${requiredString}\n`;
                        }
                    }
                    else if (dbType === 'postgresql' || dbType === 'postgres') {
                        // For PostgreSQL, use appropriate types
                        const useUuid = relationMeta.useUuid || false;
                        if (useUuid) {
                            section += `\t${relationFieldName} String${requiredString} @db.Uuid\n`;
                        }
                        else {
                            section += `\t${relationFieldName} Int${requiredString}\n`;
                        }
                    }
                    else {
                        // Default for other databases
                        section += `\t${relationFieldName} String${requiredString}\n`;
                    }
                }
                this.completeRelation(relationKey, relationIndex);
            }
            else if (annotationType === 'InverseRelation') {
                const relationMeta = modelMetadata;
                // Check if we need a custom relation name (if there are multiple relations to the same model)
                const relatedModelName = relationMeta.inversionModel._collection;
                // Generate a very short relation name using a counter
                // Use a consistent key for both sides of the relation to ensure the same name is used
                const relationKey = [relatedModelName, modelName].join('_');
                const relationIndex = this.getRelationCounter(relationKey, true);
                const relationName = this.getShortenedRelationName(relatedModelName, modelName, relationIndex);
                const mapName = relationName;
                section += `\t${key} ${relationMeta.inversionModel._collection}[] @relation("${relationName}", map: "${mapName}")\n`;
                this.completeRelation(relationKey, relationIndex, true);
            }
            else if (annotationType === 'InverseTimeSeries') {
                if (dbType === 'mongodb') {
                    section += `\t${key} String[] @db.ObjectId\n`;
                }
                else if (dbType === 'mysql') {
                    // For MySQL, we need a different approach for arrays
                    section += `\t${key} Json\n`;
                }
                else if (dbType === 'postgresql' || dbType === 'postgres') {
                    // PostgreSQL supports arrays natively
                    section += `\t${key} String[]\n`;
                }
                else {
                    section += `\t${key} String[]\n`;
                }
            }
            else if (annotationType === 'TrackType') {
                const tags = modelMetadata.tags.map((item) => '@' + item);
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
    static toConfigCase(modelType, dbType = 'mongodb') {
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
            }
            else {
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
            }
            else if (dbType === 'postgresql' || dbType === 'postgres') {
                // PostgreSQL supports arrays natively
                resultField += '[]';
            }
            else {
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
    static getRelationCounter(relationKey, inverse = false) {
        let counter = 0;
        for (const relationInfo of this.allRelations.get(relationKey)) {
            if ((relationInfo.base === true && !inverse) || (relationInfo.inversion === true && inverse)) {
                counter++;
            }
        }
        ;
        return counter;
    }
    /**
     * Process type functions metadata to extract database-specific options
     * @param metadata The metadata from a type function
     * @param dbType The database type
     * @returns Array of tags to apply to the field
     */
    static processTypeOptions(metadata, dbType) {
        var _a, _b;
        const tags = [...(metadata.tags || [])];
        // Extract any database-specific options from the metadata
        // and convert them to appropriate Prisma schema tags
        if (metadata.dbOptions) {
            // Handle MySQL-specific options
            if (dbType === 'mysql' && metadata.dbOptions.mysql) {
                if (metadata.dbOptions.mysql.useText) {
                    tags.push('db.Text');
                }
                else if (metadata.dbOptions.mysql.maxLength) {
                    tags.push(`db.VarChar(${metadata.dbOptions.mysql.maxLength})`);
                }
                if (metadata.dbOptions.mysql.useUuid && ((_a = metadata.tags) === null || _a === void 0 ? void 0 : _a.includes('id'))) {
                    tags.push('default(uuid())');
                }
            }
            // Handle PostgreSQL-specific options
            if ((dbType === 'postgresql' || dbType === 'postgres') && metadata.dbOptions.postgres) {
                if (metadata.dbOptions.postgres.useText) {
                    tags.push('db.Text');
                }
                if (metadata.dbOptions.postgres.useUuid && ((_b = metadata.tags) === null || _b === void 0 ? void 0 : _b.includes('id'))) {
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
exports.DbHelper = DbHelper;
DbHelper.dbUrlVarName = 'PRISMA_DB_URL';
DbHelper.allRelations = new Map();
