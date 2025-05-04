"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationUtils = void 0;
class PaginationUtils {
    static async paginate(paginationParams = { page: 0, per_page: 50 }, findParams = {}) {
        const conditions = findParams?.conditions ?? {};
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;
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
