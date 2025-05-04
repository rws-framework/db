"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaGenerator = void 0;
const console_1 = require("@rws-framework/console");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const _model_1 = require("../../models/_model");
const utils_1 = require("./utils");
const type_converter_1 = require("./type-converter");
const relation_manager_1 = require("./relation-manager");
const _EXECUTE_PRISMA_CMD = true;
const _REMOVE_SCHEMA_FILE = true;
/**
 * Handles Prisma schema generation
 */
class SchemaGenerator {
    static dbUrlVarName = 'PRISMA_DB_URL';
    /**
     * Generate the base schema for Prisma
     * @param dbType The database type
     * @param dbUrl The database URL
     * @returns The base schema
     */
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
    /**
     * Generate model sections for the schema
     * @param model The model to generate a section for
     * @param configService The configuration service
     * @returns The model section
     */
    static async generateModelSections(model, configService) {
        let section = '';
        const modelMetadatas = await _model_1.RWSModel.getModelAnnotations(model);
        const dbType = configService.get('db_type') || 'mongodb';
        const modelName = model._collection;
        section += `model ${modelName} {\n`;
        let hasIdType = false;
        let idFieldName;
        for (const someModelMetaKey in modelMetadatas) {
            const isIdTyped = modelMetadatas[someModelMetaKey].annotationType === 'IdType';
            if (isIdTyped) {
                hasIdType = true;
                idFieldName = someModelMetaKey;
            }
        }
        let idGenerated = false;
        if (!model._NO_ID && !hasIdType) {
            section += `\t${utils_1.DbUtils.generateId(dbType, modelMetadatas)}\n`;
            idGenerated = true;
        }
        for (const key in modelMetadatas) {
            const modelMetadata = modelMetadatas[key].metadata;
            let requiredString = modelMetadata.required ? '' : '?';
            const annotationType = modelMetadatas[key].annotationType;
            let indexedId = false;
            if (model._NO_ID || hasIdType) {
                indexedId = true;
                requiredString = '';
            }
            if (key === 'id' && !indexedId) {
                continue;
            }
            if (annotationType === 'Relation') {
                const relationMeta = modelMetadata;
                const relatedModel = relationMeta.relatedTo;
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
                const relationIndex = relation_manager_1.RelationManager.getRelationCounter(relationKey);
                const relationName = relationMeta.relationName ? relationMeta.relationName : null;
                const mapName = relationMeta.mappingName ? relationMeta.mappingName : null;
                const relatedModelMetadatas = await _model_1.RWSModel.getModelAnnotations(relatedModel);
                const relationFieldName = modelMetadata.relationField ? modelMetadata.relationField : key.toLowerCase() + '_' + modelMetadata.relationField.toLowerCase();
                const relatedToField = modelMetadata.relatedToField || 'id';
                const bindingFieldExists = !!modelMetadatas[relationFieldName];
                if (modelMetadata.required === false) {
                    requiredString = '?';
                }
                const cascadeStr = cascadeOpts.length ? `, ${cascadeOpts.join(', ')}` : '';
                if (isMany) {
                    // Add an inverse field to the related model if it doesn't exist
                    section += `\t${key} ${relatedModel._collection}[] @relation(${relationName ? `"${relationName}", ` : ''}fields: [${relationFieldName}], references: [${relatedToField}]${mapName ? `, map: "${mapName}"` : ''}${cascadeStr})\n`;
                }
                else {
                    section += `\t${key} ${relatedModel._collection}${requiredString} @relation(${relationName ? `"${relationName}", ` : ''}fields: [${relationFieldName}], references: [${relatedToField}]${mapName ? `, map: "${mapName}"` : ''}${cascadeStr})\n`;
                    if (!bindingFieldExists) {
                        const relatedFieldMeta = relatedModelMetadatas[relatedToField];
                        if (!relatedFieldMeta.metadata.required) {
                            requiredString = '';
                        }
                        let relatedFieldType = type_converter_1.TypeConverter.toConfigCase(relatedFieldMeta.metadata, dbType, true);
                        /**
                         * @todo: Detect type
                         */
                        if (relatedToField === 'id' && dbType !== 'mongodb') {
                            relatedFieldType = 'Int';
                        }
                        if (relationMeta.required === false) {
                            requiredString = '?';
                        }
                        // Add relation field with appropriate type based on database
                        if (dbType === 'mongodb') {
                            section += `\t${relationFieldName} String${requiredString} @db.ObjectId\n`;
                        }
                        else if (dbType === 'mysql') {
                            // For MySQL, determine the type based on the related model's ID type
                            section += `\t${relationFieldName} ${relatedFieldType}${requiredString}\n`;
                        }
                        else if (dbType === 'postgresql' || dbType === 'postgres') {
                            if (relatedFieldType === 'String') {
                                section += `\t${relationFieldName} ${relatedFieldType}${requiredString} @db.Uuid\n`;
                            }
                            else {
                                section += `\t${relationFieldName} ${relatedFieldType}${requiredString}\n`;
                            }
                        }
                        else {
                            section += `\t${relationFieldName} String${requiredString}\n`;
                        }
                    }
                }
                relation_manager_1.RelationManager.completeRelation(relationKey, relationIndex);
            }
            else if (annotationType === 'InverseRelation') {
                const relationMeta = modelMetadata;
                // Check if we need a custom relation name (if there are multiple relations to the same model)
                const relatedModelName = relationMeta.inversionModel._collection;
                // Generate a very short relation name using a counter
                // Use a consistent key for both sides of the relation to ensure the same name is used
                const relationKey = [relatedModelName, modelName].join('_');
                const relationIndex = relation_manager_1.RelationManager.getRelationCounter(relationKey, true);
                const relationName = relation_manager_1.RelationManager.getShortenedRelationName(relatedModelName, modelName, relationIndex);
                let relationTag = '';
                if (relationMeta.relationName) {
                    relationTag = ` @relation("${relationMeta.relationName}")`;
                }
                section += `\t${key} ${relationMeta.inversionModel._collection}[]${relationTag}\n`;
                relation_manager_1.RelationManager.completeRelation(relationKey, relationIndex, true);
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
            else {
                const trackMeta = modelMetadata;
                const trackTags = trackMeta.tags || [];
                const tags = trackTags.map((item) => '@' + item);
                const isNoIdBehavior = model._NO_ID || idFieldName;
                const isOverrideBehavior = (hasIdType && annotationType === 'IdType' && key === 'id' && idFieldName === 'id')
                    ||
                        (model._NO_ID && model._SUPER_TAGS.some(a => a.fields.includes('id')) && key === 'id');
                if (key === 'id' &&
                    isNoIdBehavior && !isOverrideBehavior) {
                    continue;
                }
                if (trackMeta.unique) {
                    const fieldDetail = typeof trackMeta.unique === 'string' ? trackMeta.unique : null;
                    tags.push(`@unique(${fieldDetail ? `map: "${fieldDetail}"` : ''})`);
                }
                if (!trackMeta.required) {
                    requiredString = '?';
                }
                if (trackMeta.isArray || trackMeta.type.name === 'Array') {
                    requiredString = '';
                }
                if (model._SUPER_TAGS.some(tag => tag.tagType === 'id' && tag.fields.includes(key))) {
                    requiredString = '';
                }
                // Process any database-specific options from the metadata
                const dbSpecificTags = type_converter_1.TypeConverter.processTypeOptions(trackMeta, dbType);
                tags.push(...dbSpecificTags);
                const isIdTypeField = modelMetadatas[key].annotationType === 'IdType';
                const fieldInUniqueSuperTag = model._SUPER_TAGS.some(st => st.tagType === 'unique' && st.fields.includes(key));
                if (isIdTypeField) {
                    requiredString = '';
                }
                let trackField = `${key} ${type_converter_1.TypeConverter.toConfigCase(trackMeta, dbType, key === 'id', isOverrideBehavior)}${requiredString} ${tags.join(' ')}`;
                if (isIdTypeField) {
                    trackField += utils_1.DbUtils.addIdPart(dbType, utils_1.DbUtils.doesUseUuid(modelMetadatas), trackMeta.noAuto);
                    idGenerated = true;
                }
                section += `\t${trackField}\n`;
            }
        }
        if (model._SUPER_TAGS.length) {
            section += '\n';
        }
        for (const superTag of model._SUPER_TAGS) {
            const mapStr = superTag.map ? `, map: "${superTag.map}"` : '';
            const superFields = [];
            for (const superField of superTag.fields) {
                const fieldMetadata = modelMetadatas[superField]['metadata'];
                let pushed = false;
                if (fieldMetadata.dbOptions && fieldMetadata.dbOptions.mysql && fieldMetadata.dbOptions.mysql.useType) {
                    switch (fieldMetadata.dbOptions.mysql.useType) {
                        case 'db.LongText':
                            superFields.push(`${superField}(length: 255)`);
                            pushed = true;
                            break;
                    }
                }
                if (!pushed) {
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
                        // Add this relation to the map
                        relation_manager_1.RelationManager.markRelation(relationKey);
                    }
                    if (annotationType === 'InverseRelation') {
                        const relationMeta = modelMetadatas[key].metadata;
                        const relatedModel = relationMeta.inversionModel;
                        const relatedModelName = relatedModel._collection;
                        const relationKey = [relatedModelName, modelName].join('_');
                        relation_manager_1.RelationManager.markRelation(relationKey, true);
                    }
                }
            }
            // Now generate the model sections with all relations
            for (const model of dbModels) {
                const modelSection = await SchemaGenerator.generateModelSections(model, configService);
                template += '\n\n' + modelSection;
                console.log(chalk_1.default.green('[RWS]'), chalk_1.default.blue('Building DB Model'), model.name);
            }
            const [schemaDir, schemaPath] = utils_1.DbUtils.getSchemaDir();
            if (!fs_1.default.existsSync(schemaDir)) {
                fs_1.default.mkdirSync(schemaDir);
            }
            if (fs_1.default.existsSync(schemaPath)) {
                fs_1.default.unlinkSync(schemaPath);
            }
            fs_1.default.writeFileSync(schemaPath, template);
            if (_EXECUTE_PRISMA_CMD)
                await console_1.rwsShell.runCommand(`${utils_1.DbUtils.detectInstaller()} prisma generate --schema=${schemaPath}`, process.cwd());
            console.log(chalk_1.default.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);
            if (_REMOVE_SCHEMA_FILE) {
                fs_1.default.unlinkSync(schemaPath);
            }
        }
    }
    /**
     * Push database models to the database
     * @param configService The configuration service
     * @param dbService The database service
     * @param leaveFile Whether to leave the schema file after generation
     */
    static async pushDBModels(configService, dbService, leaveFile = false) {
        process.env = { ...process.env, [this.dbUrlVarName]: configService.get('db_url') };
        const [_, schemaPath] = utils_1.DbUtils.getProcessedSchemaDir();
        await console_1.rwsShell.runCommand(`${utils_1.DbUtils.detectInstaller()} prisma db push --schema=${schemaPath}`, process.cwd());
    }
}
exports.SchemaGenerator = SchemaGenerator;
