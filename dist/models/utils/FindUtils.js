"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindUtils = void 0;
const LoadingContext_1 = require("./LoadingContext");
const chalk_1 = __importDefault(require("chalk"));
function circularReferenceWarning(modelType, id) {
    console.warn(chalk_1.default.yellow(`Circular reference detected: ${modelType}:${id} is already being loaded. Breaking cycle.`));
}
class FindUtils {
    static async findOneBy(opModel, findParams) {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext_1.LoadingContext.withNewExecutionContext(async () => {
            const conditions = findParams?.conditions ?? {};
            const ordering = findParams?.ordering ?? null;
            const fields = findParams?.fields ?? null;
            const allowRelations = findParams?.allowRelations ?? true;
            const fullData = findParams?.fullData ?? false;
            opModel.checkForInclusionWithThrow('');
            const collection = Reflect.get(opModel, '_collection');
            const dbData = await opModel.services.dbService.findOneBy(collection, conditions, fields, ordering);
            if (dbData) {
                const modelType = opModel.name;
                const id = dbData.id;
                // Check if this model is already being loaded to prevent circular references
                if (LoadingContext_1.LoadingContext.isLoading(modelType, id)) {
                    circularReferenceWarning(modelType, id);
                    return null;
                }
                return await LoadingContext_1.LoadingContext.withLoadingContext(modelType, id, async () => {
                    const inst = new opModel();
                    const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);
                    return loaded;
                });
            }
            return null;
        });
    }
    static async find(opModel, id, findParams = null) {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext_1.LoadingContext.withNewExecutionContext(async () => {
            const ordering = findParams?.ordering ?? null;
            const fields = findParams?.fields ?? null;
            const allowRelations = findParams?.allowRelations ?? true;
            const fullData = findParams?.fullData ?? false;
            const collection = Reflect.get(opModel, '_collection');
            opModel.checkForInclusionWithThrow(opModel.name);
            const dbData = await opModel.services.dbService.findOneBy(collection, { id }, fields, ordering);
            if (dbData) {
                const modelType = opModel.name;
                // Check if this model is already being loaded to prevent circular references
                if (LoadingContext_1.LoadingContext.isLoading(modelType, id)) {
                    circularReferenceWarning(modelType, id);
                    return null;
                }
                return await LoadingContext_1.LoadingContext.withLoadingContext(modelType, id, async () => {
                    const inst = new opModel();
                    const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);
                    return loaded;
                });
            }
            return null;
        });
    }
    static async findBy(opModel, findParams) {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext_1.LoadingContext.withNewExecutionContext(async () => {
            const conditions = findParams?.conditions ?? {};
            const ordering = findParams?.ordering ?? null;
            const fields = findParams?.fields ?? null;
            const allowRelations = findParams?.allowRelations ?? true;
            const fullData = findParams?.fullData ?? false;
            const collection = Reflect.get(opModel, '_collection');
            opModel.checkForInclusionWithThrow(opModel.name);
            try {
                const paginateParams = findParams?.pagination ? findParams?.pagination : undefined;
                const dbData = await opModel.services.dbService.findBy(collection, conditions, fields, ordering, paginateParams);
                if (dbData.length) {
                    const instanced = [];
                    for (const data of dbData) {
                        const modelType = opModel.name;
                        const id = data.id;
                        // Check if this model is already being loaded to prevent circular references
                        if (LoadingContext_1.LoadingContext.isLoading(modelType, id)) {
                            circularReferenceWarning(modelType, id);
                            continue;
                        }
                        const loaded = await LoadingContext_1.LoadingContext.withLoadingContext(modelType, id, async () => {
                            const inst = new opModel();
                            return await inst._asyncFill(data, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);
                        });
                        if (loaded) {
                            instanced.push(loaded);
                        }
                    }
                    return instanced;
                }
                return [];
            }
            catch (rwsError) {
                console.error(rwsError);
                throw rwsError;
            }
        });
    }
    static async paginate(opModel, paginateParams, findParams) {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext_1.LoadingContext.withNewExecutionContext(async () => {
            const conditions = findParams?.conditions ?? {};
            const ordering = findParams?.ordering ?? null;
            const fields = findParams?.fields ?? null;
            const allowRelations = findParams?.allowRelations ?? true;
            const fullData = findParams?.fullData ?? false;
            const collection = Reflect.get(opModel, '_collection');
            opModel.checkForInclusionWithThrow(opModel.name);
            try {
                const dbData = await opModel.services.dbService.findBy(collection, conditions, fields, ordering, paginateParams);
                if (dbData.length) {
                    const instanced = [];
                    for (const data of dbData) {
                        const modelType = opModel.name;
                        const id = data.id;
                        // Check if this model is already being loaded to prevent circular references
                        if (LoadingContext_1.LoadingContext.isLoading(modelType, id)) {
                            circularReferenceWarning(modelType, id);
                            continue;
                        }
                        const loaded = await LoadingContext_1.LoadingContext.withLoadingContext(modelType, id, async () => {
                            const inst = new opModel();
                            return await inst._asyncFill(data, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);
                        });
                        if (loaded) {
                            instanced.push(loaded);
                        }
                    }
                    return instanced;
                }
                return [];
            }
            catch (rwsError) {
                console.error(rwsError);
                throw rwsError;
            }
        });
    }
}
exports.FindUtils = FindUtils;
