export interface IDbOpts {
    dbOptions?: {
        mysql?: {
          useType?: string;
          useText?: boolean;
          maxLength?: number;
          useUuid?: boolean;
          params?: string[]
        };
        postgres?: {
          useType?: string;
          useText?: boolean;
          useUuid?: boolean;
          params?: string[]
        };
        mongodb?: {
          customType?: string;
          params?: string[]
        };
    }
}