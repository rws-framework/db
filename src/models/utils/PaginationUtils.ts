import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { IRWSModel } from '../../types/IRWSModel';
import { OpModelType, RWSModel } from '../_model';
import { FindByType, IPaginationParams } from '../../types/FindParams';

export class PaginationUtils {

    public static async paginate<T extends RWSModel<T>>(
            this: OpModelType<T>,             
            paginationParams: IPaginationParams = { page: 0, per_page: 50 },
            findParams: FindByType = {},
        ): Promise<T[]> {
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
                const instanced: T[] = [];
        
                for (const data of dbData) { 
                    const inst: T = new (this as { new(): T })();
                    instanced.push((await inst._asyncFill(data, fullData,allowRelations)) as T);
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
