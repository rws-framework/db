import { RelOneMetaType, RelManyMetaType } from '../types/RelationTypes';
import { IRWSModel } from '../../types/IRWSModel';
export declare class RelationUtils {
    static getRelationOneMeta(model: any, classFields: string[]): Promise<RelOneMetaType<IRWSModel>>;
    static getRelationManyMeta(model: any, classFields: string[]): Promise<RelManyMetaType<IRWSModel>>;
    static bindRelation(relatedModel: any): {
        connect: {
            id: string;
        };
    };
    static hasRelation(model: any, key: string): boolean;
    static checkRelEnabled(model: any, key: string): boolean;
}
