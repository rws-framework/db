"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationUtils = void 0;
class PaginationUtils {
    static async paginate(paginationParams = { page: 0, per_page: 50 }, findParams = {}) {
        var _a, _b, _c, _d, _e;
        const conditions = (_a = findParams === null || findParams === void 0 ? void 0 : findParams.conditions) !== null && _a !== void 0 ? _a : {};
        const ordering = (_b = findParams === null || findParams === void 0 ? void 0 : findParams.ordering) !== null && _b !== void 0 ? _b : null;
        const fields = (_c = findParams === null || findParams === void 0 ? void 0 : findParams.fields) !== null && _c !== void 0 ? _c : null;
        const allowRelations = (_d = findParams === null || findParams === void 0 ? void 0 : findParams.allowRelations) !== null && _d !== void 0 ? _d : true;
        const fullData = (_e = findParams === null || findParams === void 0 ? void 0 : findParams.fullData) !== null && _e !== void 0 ? _e : false;
        const collection = Reflect.get(this, '_collection');
        this.checkForInclusionWithThrow(this.name);
        try {
            const dbData = await this.services.dbService.findBy(collection, conditions, fields, ordering, paginationParams);
            if (dbData.length) {
                const instanced = [];
                for (const data of dbData) {
                    const inst = new this();
                    instanced.push((await inst._asyncFill(data, fullData, allowRelations)));
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
exports.PaginationUtils = PaginationUtils;
