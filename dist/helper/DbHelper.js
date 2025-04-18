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
        let template = `generator client {\n
        provider = "prisma-client-js"\n
    }\n\n`;
        template += `\ndatasource db {\n
        provider = "${dbType}"\n
        url = env("${this.dbUrlVarName}")\n
    }\n\n`;
        const dbModels = configService.get('db_models');
        if (dbModels) {
            for (const model of dbModels) {
                const modelSection = await DbHelper.generateModelSections(model, configService);
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
            process.env = { ...process.env, [this.dbUrlVarName]: dbUrl };
            // Use npx directly with the full path to prisma
            const npxPath = path_1.default.join(workspaceRoot, 'node_modules', '.bin', 'npx');
            const prismaPath = path_1.default.join(workspaceRoot, 'node_modules', '.bin', 'prisma');
            try {
                // Try using npx with the full path
                await console_1.rwsShell.runCommand(`"${npxPath}" prisma generate --schema="${schemaPath}"`, process.cwd());
            }
            catch (error) {
                // If that fails, try using the prisma binary directly
                try {
                    await console_1.rwsShell.runCommand(`"${prismaPath}" generate --schema="${schemaPath}"`, process.cwd());
                }
                catch (innerError) {
                    // If both fail, try using node to run prisma
                    const nodePrismaPath = path_1.default.join(workspaceRoot, 'node_modules', 'prisma', 'build', 'index.js');
                    await console_1.rwsShell.runCommand(`node "${nodePrismaPath}" generate --schema="${schemaPath}"`, process.cwd());
                }
            }
            leaveFile = false;
            log(chalk_1.default.green('[RWS Init]') + ' prisma schema generated from ', schemaPath);
            if (!leaveFile) {
                fs_1.default.unlinkSync(schemaPath);
            }
        }
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
        const schemaDir = path_1.default.join(moduleDir, 'prisma');
        const schemaPath = path_1.default.join(schemaDir, 'schema.prisma');
        // Use npx directly with the full path to prisma
        const execCmdPath = path_1.default.join(workspaceRoot, 'node_modules', '.bin', 'yarn.cmd');
        const execPrismaPath = path_1.default.join(workspaceRoot, 'node_modules', '.bin', 'yarn.cmd');
        await console_1.rwsShell.runCommand(`${this.detectInstaller()} prisma db push --schema="${schemaPath}"`, process.cwd());
    }
    static async generateModelSections(model, configService) {
        var _a, _b;
        let section = '';
        const modelMetadatas = await _model_1.RWSModel.getModelAnnotations(model);
        const modelName = model._collection;
        section += `model ${modelName} {\n`;
        section += `\t${this.generateId(configService.get('db_type'))}\n`;
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
DbHelper.dbUrlVarName = 'PRISMA_DB_URL';
