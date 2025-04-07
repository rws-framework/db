import { OpModelType, RWSModel } from '../_model';
import { FindByType, IPaginationParams } from '../../types/FindParams';
export declare class PaginationUtils {
    static paginate<T extends RWSModel<T>>(this: OpModelType<T>, paginationParams?: IPaginationParams, findParams?: FindByType): Promise<T[]>;
}
