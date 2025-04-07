import { IRWSModel } from '../../types/IRWSModel';
import { FindByType, IPaginationParams } from '../../types/FindParams';
import { IRWSModelServices } from './IRWSModelServices';
import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { DBService } from '../../services/DBService';

// Forward declaration to avoid circular dependency
type RWSModel<T> = any;

export interface OpModelType<ChildClass> {
    new(data?: any | null): ChildClass;
    services: IRWSModelServices;
    name: string;
    _collection: string;
    _RELATIONS: {[key: string]: boolean};
    _CUT_KEYS: string[];
    allModels: OpModelType<any>[];
    loadModels: () => OpModelType<any>[];
    checkForInclusionWithThrow: (className: string) => void;
    checkForInclusion: (className: string) => boolean;
    findOneBy<T extends RWSModel<T>>(
        this: OpModelType<T>,
        findParams: FindByType
    ): Promise<T | null>;
    find<T extends RWSModel<T>>(
        this: OpModelType<T>,
        id: string,        
        findParams?: Omit<FindByType, 'conditions'>
    ): Promise<T | null>;
    findBy<T extends RWSModel<T>>(
        this: OpModelType<T>,    
        findParams: FindByType
    ): Promise<T[]>;
    paginate<T extends RWSModel<T>>(
        this: OpModelType<T>,    
        paginateParams?: IPaginationParams,
        findParams?: FindByType
    ): Promise<T[]>;
    delete<ChildClass extends RWSModel<ChildClass>>(
        this: OpModelType<ChildClass>,
        conditions: any
    ): Promise<void>;
    create<T extends RWSModel<T>>(this: OpModelType<T>, data: T): Promise<T>;
    getRelationOneMeta(model: any, classFields: string[]): Promise<RelOneMetaType<IRWSModel>>;
    getRelationManyMeta(model: any, classFields: string[]): Promise<RelManyMetaType<IRWSModel>>;
    getCollection(): string;
    getDb(): DBService;
    setServices(services: IRWSModelServices): void;
}
