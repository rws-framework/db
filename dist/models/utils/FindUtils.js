"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindUtils = void 0;
class FindUtils {
    static async findOneBy(opModel, findParams) {
        const conditions = findParams?.conditions ?? {};
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;
        opModel.checkForInclusionWithThrow('');
        const collection = Reflect.get(opModel, '_collection');
        const dbData = await opModel.services.dbService.findOneBy(collection, conditions, fields, ordering);
        if (dbData) {
            const inst = new opModel();
            const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams.cancelPostLoad ? false : true);
            return loaded;
        }
        return null;
    }
    static async find(opModel, id, findParams = null) {
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;
        const collection = Reflect.get(opModel, '_collection');
        opModel.checkForInclusionWithThrow(opModel.name);
        const dbData = await opModel.services.dbService.findOneBy(collection, { id }, fields, ordering);
        if (dbData) {
            const inst = new opModel();
            const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams.cancelPostLoad ? false : true);
            return loaded;
        }
        return null;
    }
    static async findBy(opModel, findParams) {
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
                    const inst = new opModel();
                    instanced.push((await inst._asyncFill(data, fullData, allowRelations, findParams.cancelPostLoad ? false : true)));
                }
                return instanced;
            }
            return [];
        }
        catch (rwsError) {
            console.error(rwsError);
            throw rwsError;
        }
    }
    static async paginate(opModel, paginateParams, findParams) {
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
                    const inst = new opModel();
                    instanced.push((await inst._asyncFill(data, fullData, allowRelations, findParams.cancelPostLoad ? false : true)));
                }
                return instanced;
            }
            return [];
        }
        catch (rwsError) {
            console.error(rwsError);
            throw rwsError;
        }
    }
}
exports.FindUtils = FindUtils;
