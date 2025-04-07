import { IRWSModel } from '../../types/IRWSModel';
// Using a type reference to avoid circular dependency
type OpModelType<T> = any;

export type RelationBindType = {
    connect: { id: string }
};

export type RelOneMetaType<T extends IRWSModel> = {
    [key: string]: {
        required: boolean, 
        key?: string, 
        model: OpModelType<T>, 
        hydrationField: string, 
        foreignKey: string
    }
};

export type RelManyMetaType<T extends IRWSModel> = {
    [key: string]: {
        key: string, 
        inversionModel: OpModelType<T>, 
        foreignKey: string
    }
};
