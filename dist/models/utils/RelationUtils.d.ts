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
    };
    static hasRelation(model: RWSModel<any>, key: string): boolean;
    static checkRelEnabled(model: RWSModel<any>, key: string): boolean;
}
