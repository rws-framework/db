import { OpModelType } from "../models/_model";
export interface ISuperTagData {
    tagType: string;
    fields: string[];
    map: string;
}
export interface IRWSCollectionOpts {
    relations?: {
        [key: string]: boolean;
    };
    ignored_keys?: string[];
    noId?: boolean;
    superTags?: ISuperTagData[];
}
export interface IRWSCollectionMeta {
    collectionName: string;
    options?: IRWSCollectionOpts;
}
export declare function RWSCollection(collectionName: string, options?: IRWSCollectionOpts): (target: OpModelType<any>) => void;
