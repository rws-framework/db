import { OpModelType } from "../models/interfaces/OpModelType";
export interface IDbConfigParams {
    db_url?: string;
    db_name?: string;
    db_type?: 'mongodb' | 'mysql' | 'sqlite' | 'postgresql' | 'postgres';
    db_models?: OpModelType<any>[];
    db_prisma_output?: string;
    db_prisma_binary_targets?: string[];
}
export interface IdGeneratorOptions {
    useUuid?: boolean;
    customType?: string;
}
export interface IDbConfigHandler {
    get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K];
}
