import { IDbOpts } from "./IDbOpts";

export interface IIdTypeOpts extends IDbOpts {     
    unique?: boolean | string;
    noAuto?: boolean;
}