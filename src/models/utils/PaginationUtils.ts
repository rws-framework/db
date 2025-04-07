import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { IRWSModel } from '../../types/IRWSModel';
import { OpModelType, RWSModel } from '../_model';
import { FindByType, IPaginationParams } from '../../types/FindParams';

export class PaginationUtils {

    public static async paginate<ChildClass extends RWSModel<ChildClass>>(
            this: OpModelType<ChildClass>,             
            paginationParams: IPaginationParams = { page: 0, per_page: 50 },
            findParams: FindByType = {},
        ): Promise<ChildClass[]> {
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
                const instanced: ChildClass[] = [];
        
                for (const data of dbData) { 
                    const inst: ChildClass = new (this as { new(): ChildClass })();
                    instanced.push((await inst._asyncFill(data, fullData,allowRelations)) as ChildClass);
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
