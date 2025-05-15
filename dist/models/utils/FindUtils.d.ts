import { RWSModel } from "../core/RWSModel";
import { OpModelType } from "..";
import { FindByType, IPaginationParams } from "../../types/FindParams";
export declare class FindUtils {
    static findOneBy<T extends RWSModel<T>>(opModel: OpModelType<T>, findParams?: FindByType): Promise<T | null>;
    static find<T extends RWSModel<T>>(opModel: OpModelType<T>, id: string | number, findParams?: Omit<FindByType, 'conditions'>): Promise<T | null>;
    static findBy<T extends RWSModel<T>>(opModel: OpModelType<T>, findParams?: FindByType): Promise<T[]>;
    static paginate<T extends RWSModel<T>>(opModel: OpModelType<T>, paginateParams: IPaginationParams, findParams?: FindByType): Promise<T[]>;
}
