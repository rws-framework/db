import { IDbConfigHandler } from '../../types/DbConfigHandler';
import { DBService } from '../../services/DBService';

export interface IRWSModelServices {
    configService?: IDbConfigHandler;
    dbService?: DBService;
}
