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
        const dbUrl = configService.get('mongo_url');
        const dbType = 'mongodb';
        let template = `generator client {\n
        provider = "prisma-client-js"\n
    }\n\n`;
        template += `\ndatasource db {\n
        provider = "${dbType}"\n
        url = env("DATABASE_URL")\n    
    }\n\n`;
        const dbModels = configService.get('db_models');
        if (dbModels) {
            for (const model of dbModels) {
                const modelSection = await DbHelper.generateModelSections(model);
                template += '\n\n' + modelSection;
                log(chalk_1.default.green('[RWS]'), chalk_1.default.blue('Building DB Model'), model.name);
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
            const schemaDir = path_1.default.join(moduleDir, 'prisma');
            const schemaPath = path_1.default.join(schemaDir, 'schema.prisma');
            if (!fs_1.default.existsSync(schemaDir)) {
                fs_1.default.mkdirSync(schemaDir);
            }
            if (fs_1.default.existsSync(schemaPath)) {
                fs_1.default.unlinkSync(schemaPath);
            }
            fs_1.default.writeFileSync(schemaPath, template);
            process.env.DB_URL = dbUrl;
            const endPrisma = 'npx prisma';
            // console.log({cwd: process.cwd()})
            // const clientPath = path.join(rwsPath.findRootWorkspacePath(), 'node_modules', '.prisma', 'client');
            await console_1.rwsShell.runCommand(`${endPrisma} generate --schema=${schemaPath}`, process.cwd());
            leaveFile = false;
            log(chalk_1.default.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);
            if (!leaveFile) {
                fs_1.default.unlinkSync(schemaPath);
            }
        }
    }
    static async generateModelSections(model) {
        var _a, _b;
        let section = '';
        const modelMetadatas = await _model_1.RWSModel.getModelAnnotations(model);
        const modelName = model._collection;
        section += `model ${modelName} {\n`;
        section += '\tid String @map("_id") @id @default(auto()) @db.ObjectId\n';
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
                if (isMany) {
                    // Handle many-to-many or one-to-many relation
                    section += `\t${key} ${relatedModel._collection}[] @relation("${modelName}_${relatedModel._collection}")\n`;
                }
                else {
                    // Handle one-to-one or many-to-one relation
                    section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${modelName}_${relatedModel._collection}", fields: [${modelMetadata.relationField}], references: [${modelMetadata.relatedToField || 'id'}], ${cascadeOpts.join(', ')})\n`;
                    section += `\t${modelMetadata.relationField} String${requiredString} @db.ObjectId\n`;
                }
            }
            else if (annotationType === 'InverseRelation') {
                const relationMeta = modelMetadata;
                // Handle inverse relation (one-to-many or one-to-one)
                section += `\t${key} ${relationMeta.inversionModel._collection}[] @relation("${relationMeta.relationName ? relationMeta.relationName : `${relationMeta.inversionModel._collection}_${modelName}`}")\n`;
            }
            else if (annotationType === 'InverseTimeSeries') {
                section += `\t${key} String[] @db.ObjectId\n`;
            }
            else if (annotationType === 'TrackType') {
                const tags = modelMetadata.tags.map((item) => '@' + item);
                if (modelMetadata.isArray || modelMetadata.type.name === 'Array') {
                    requiredString = '';
                }
                section += `\t${key} ${DbHelper.toConfigCase(modelMetadata)}${requiredString} ${tags.join(' ')}\n`;
            }
        }
        section += '}\n';
        return section;
    }
    static toConfigCase(modelType) {
        const type = modelType.type;
        let input = type.name;
        if (input == 'Number') {
            input = 'Int';
        }
        if (input == 'Object') {
            input = 'Json';
        }
        if (input == 'Date') {
            input = 'DateTime';
        }
        if (input == 'Array') {
            input = 'Json[]';
        }
        const firstChar = input.charAt(0).toUpperCase();
        const restOfString = input.slice(1);
        let resultField = firstChar + restOfString;
        if (modelType.isArray) {
            resultField += '[]';
        }
        return resultField;
    }
}
exports.DbHelper = DbHelper;
