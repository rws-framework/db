import { RWSModel } from "../core/RWSModel";
import { RelManyMetaType, RelOneMetaType } from "../types/RelationTypes";
import { IRWSModel } from "../../types/IRWSModel";
import { TimeSeriesUtils } from "./TimeSeriesUtils";
import { RelationUtils } from "./RelationUtils";
import { OpModelType } from "..";
import { ModelUtils } from "./ModelUtils";
import { FindByType, IPaginationParams, OrderByType } from "../../types/FindParams";

export class FindUtils {
    public static async findOneBy<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        findParams?: FindByType
    ): Promise<T | null> {
        const conditions = findParams?.conditions ?? {};
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;

        opModel.checkForInclusionWithThrow('');


        const collection = Reflect.get(opModel, '_collection');
        const dbData = await opModel.services.dbService.findOneBy(collection, conditions, fields, ordering);


        if (dbData) {
            const inst: T = new (opModel as { new(): T })();
            const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);        
            return loaded as T;
        }

        return null;
    }

    public static async find<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        id: string | number,
        findParams: Omit<FindByType, 'conditions'> = null
    ): Promise<T | null> {
        const ordering = findParams?.ordering ?? null;
        const fields = findParams?.fields ?? null;
        const allowRelations = findParams?.allowRelations ?? true;
        const fullData = findParams?.fullData ?? false;

        const collection = Reflect.get(opModel, '_collection');
        opModel.checkForInclusionWithThrow(opModel.name);

        const dbData = await opModel.services.dbService.findOneBy(collection, { id }, fields, ordering);

        if (dbData) {
            const inst: T = new (opModel as { new(): T })();
            const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);
            return loaded as T;
        }

        return null;
    }

    public static async findBy<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        findParams?: FindByType
    ): Promise<T[]> {
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
                const instanced: T[] = [];

                for (const data of dbData) {
                    const inst: T = new (opModel as { new(): T })();

                    instanced.push((await inst._asyncFill(data, fullData, allowRelations, findParams?.cancelPostLoad ? false : true)) as T);
                }

                return instanced;
            }

            return [];
        } catch (rwsError: Error | any) {
            console.error(rwsError);

            throw rwsError;
        }
    }

    public static async paginate<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        paginateParams: IPaginationParams,
        findParams?: FindByType
    ): Promise<T[]> {
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
                const instanced: T[] = [];

                for (const data of dbData) {
                    const inst: T = new (opModel as { new(): T })();                    
                    instanced.push((await inst._asyncFill(data, fullData, allowRelations, findParams?.cancelPostLoad ? false : true)) as T);
                }

                return instanced;
            }

            return [];
        } catch (rwsError: Error | any) {
            console.error(rwsError);

            throw rwsError;
        }
    }
}
