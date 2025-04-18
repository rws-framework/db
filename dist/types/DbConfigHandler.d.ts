import { OpModelType } from "../models/interfaces/OpModelType";
export interface IDbConfigParams {
    db_url?: string;
    db_name?: string;
    db_type?: 'mongodb' | 'mysql' | 'sqlite';
    db_models?: OpModelType<any>[];
}
export interface IdGeneratorOptions {
    useUuid?: boolean;
    customType?: string;
}
export interface IDbConfigHandler {
    get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K];
}
