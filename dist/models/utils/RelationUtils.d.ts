import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { IRWSModel } from '../../types/IRWSModel';
import { RWSModel } from '../_model';
export declare class RelationUtils {
    static getRelationOneMeta(model: RWSModel<any>, classFields: string[]): Promise<RelOneMetaType<IRWSModel>>;
    static getRelationManyMeta(model: RWSModel<any>, classFields: string[]): Promise<RelManyMetaType<IRWSModel>>;
    static bindRelation(relatedModel: RWSModel<any>): {
        connect: {
            id: string | number;
        };
    } | null;
    static hasRelation(constructor: any, variable: string): Promise<boolean>;
    static checkRelDisabled(model: RWSModel<any>, key: string): boolean;
}
