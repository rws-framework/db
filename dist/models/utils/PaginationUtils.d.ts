import { OpModelType, RWSModel } from '../_model';
import { FindByType, IPaginationParams } from '../../types/FindParams';
export declare class PaginationUtils {
    static paginate<ChildClass extends RWSModel<ChildClass>>(this: OpModelType<ChildClass>, paginationParams?: IPaginationParams, findParams?: FindByType): Promise<ChildClass[]>;
}
