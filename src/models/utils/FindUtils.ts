import { RWSModel } from "../core/RWSModel";
import { RelManyMetaType, RelOneMetaType } from "../types/RelationTypes";
import { IRWSModel } from "../../types/IRWSModel";
import { TimeSeriesUtils } from "./TimeSeriesUtils";
import { RelationUtils } from "./RelationUtils";
import { OpModelType } from "..";
import { ModelUtils } from "./ModelUtils";
import { FindByType, IPaginationParams } from "../../types/FindParams";
import { LoadingContext } from "./LoadingContext";
import chalk from 'chalk';

function circularReferenceWarning(modelType: string, id: string | number): void {
    console.warn(chalk.yellow(`Circular reference detected: ${modelType}:${id} is already being loaded. Breaking cycle.`));
}

export class FindUtils {
    public static async findOneBy<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        findParams?: FindByType
    ): Promise<T | null> {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext.withNewExecutionContext(async () => {
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
                if (LoadingContext.isLoading(modelType, id)) {
                    circularReferenceWarning(modelType, id);
                    return null;
                }

                return await LoadingContext.withLoadingContext(modelType, id, async () => {
                    const inst: T = new (opModel as { new(): T })();
                    const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);        
                    return loaded as T;
                });
            }

            return null;
        });
    }

    public static async find<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        id: string | number,
        findParams: Omit<FindByType, 'conditions'> = null
    ): Promise<T | null> {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext.withNewExecutionContext(async () => {
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
                if (LoadingContext.isLoading(modelType, id)) {
                    circularReferenceWarning(modelType, id);
                    return null;
                }

                return await LoadingContext.withLoadingContext(modelType, id, async () => {
                    const inst: T = new (opModel as { new(): T })();
                    const loaded = await inst._asyncFill(dbData, fullData, allowRelations, findParams?.cancelPostLoad ? false : true);
                    return loaded as T;
                });
            }

            return null;
        });
    }

    public static async findBy<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        findParams?: FindByType
    ): Promise<T[]> {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext.withNewExecutionContext(async () => {
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
                        const modelType = opModel.name;
                        const id = data.id;
                        
                        // Check if this model is already being loaded to prevent circular references
                        if (LoadingContext.isLoading(modelType, id)) {
                            circularReferenceWarning(modelType, id);
                            continue;
                        }

                        const loaded = await LoadingContext.withLoadingContext(modelType, id, async () => {
                            const inst: T = new (opModel as { new(): T })();
                            return await inst._asyncFill(data, fullData, allowRelations, findParams?.cancelPostLoad ? false : true) as T;
                        });

                        if (loaded) {
                            instanced.push(loaded);
                        }
                    }

                    return instanced;
                }

                return [];
            } catch (rwsError: Error | any) {
                console.error(rwsError);

                throw rwsError;
            }
        });
    }

    public static async paginate<T extends RWSModel<T>>(
        opModel: OpModelType<T>,
        paginateParams: IPaginationParams,
        findParams?: FindByType
    ): Promise<T[]> {
        // Wrap in new execution context to ensure clean loading stack per operation
        return LoadingContext.withNewExecutionContext(async () => {
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
                        const modelType = opModel.name;
                        const id = data.id;
                        
                        // Check if this model is already being loaded to prevent circular references
                        if (LoadingContext.isLoading(modelType, id)) {
                            circularReferenceWarning(modelType, id);
                            continue;
                        }

                        const loaded = await LoadingContext.withLoadingContext(modelType, id, async () => {
                            const inst: T = new (opModel as { new(): T })();
                            return await inst._asyncFill(data, fullData, allowRelations, findParams?.cancelPostLoad ? false : true) as T;
                        });

                        if (loaded) {
                            instanced.push(loaded);
                        }
                    }

                    return instanced;
                }

                return [];
            } catch (rwsError: Error | any) {
                console.error(rwsError);

                throw rwsError;
            }
        });
    }
}
