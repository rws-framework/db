import { IRWSModel } from '../../types/IRWSModel';
import { FindByType, IPaginationParams } from '../../types/FindParams';
import { IRWSModelServices } from './IRWSModelServices';
import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { DBService } from '../../services/DBService';
import type { RWSModel } from '../core/RWSModel';
import { ISuperTagData } from '../../decorators/RWSCollection';
export interface OpModelType<T> {
    new (data?: any | null): T;
    services: IRWSModelServices;
    name: string;
    _collection: string;
    _NO_ID: boolean;
    _SUPER_TAGS: ISuperTagData[];
    _RELATIONS: {
        [key: string]: boolean;
    };
    _CUT_KEYS: string[];
    allModels: OpModelType<any>[];
    loadModels: () => OpModelType<any>[];
    checkForInclusionWithThrow: (className: string) => void;
    checkForInclusion: (className: string) => boolean;
    findOneBy<T extends RWSModel<T>>(this: OpModelType<T>, findParams?: FindByType): Promise<T | null>;
    find<T extends RWSModel<T>>(this: OpModelType<T>, id: string | number, findParams?: Omit<FindByType, 'conditions'>): Promise<T | null>;
    findBy<T extends RWSModel<T>>(this: OpModelType<T>, findParams?: FindByType): Promise<T[]>;
    paginate<T extends RWSModel<T>>(this: OpModelType<T>, paginateParams?: IPaginationParams, findParams?: FindByType): Promise<T[]>;
    delete<T extends RWSModel<T>>(this: OpModelType<T>, conditions: any): Promise<void>;
    create<T extends RWSModel<T>>(this: new () => T, data: any): Promise<T>;
    getRelationOneMeta(model: any, classFields: string[]): Promise<RelOneMetaType<IRWSModel>>;
    getRelationManyMeta(model: any, classFields: string[]): Promise<RelManyMetaType<IRWSModel>>;
    getCollection(): string | null;
    getDb(): DBService;
    setServices(services: IRWSModelServices): void;
    watchCollection<T extends RWSModel<T>>(this: OpModelType<T>, preRun: () => void): Promise<any>;
    count(where?: {
        [k: string]: any;
    }): Promise<number>;
    buildPrismaIncludes<T extends RWSModel<T>>(this: OpModelType<T>, fields?: string[]): Promise<any>;
    isSubclass<T extends RWSModel<T>, C extends new () => T>(constructor: C, baseClass: new () => T): boolean;
    getModelAnnotations<T extends unknown>(constructor: new () => T): Promise<Record<string, {
        annotationType: string;
        metadata: any;
    }>>;
    checkTimeSeries(constructor: any): boolean;
    checkDbVariable(constructor: any, variable: string): Promise<boolean>;
}
