import { OpModelType } from "../models/interfaces/OpModelType";
export interface IDbConfigParams {
    db_url?: string;
    db_name?: string;
    db_type?: string;
    db_models?: OpModelType<any>[];
}
export interface IDbConfigHandler {
    get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K];
}
