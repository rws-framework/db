# Models

RWS models are converted to Prisma schemas and are wrapping around generated PrismaClient providing complete typing and better Relation handling + TimeSeries in future versions.

## Models index file

```typescript
import ApiKey from "./ApiKey";
import User from "./User";

export const models = [ User, ApiKey];
```
## Example user model

```typescript
    import { TrackType, InverseRelation, RWSCollection, RWSModel } from '@rws-framework/db';

    import IUser from './interfaces/IUser';
    import 'reflect-metadata';

    import ApiKey from './ApiKey';
    import IApiKey from './interfaces/IApiKey';

@RWSCollection('users', {
    ignored_keys: ['passwd']
})
class User extends RWSModel<User> implements IUser {
    @TrackType(String)
    username: string;

    @TrackType(String) // Can also handle Object and Number
    passwd: string;

    @TrackType(Boolean)
    active: boolean;

    @TrackType(Date, { required: true })
    created_at: Date;
  
    @TrackType(Date)
    updated_at: Date;

    /**
     * Every relation and inverse relation decorator 
     * uses arrow function model passing
     **/
    @InverseRelation(() => ApiKey, () => User)
    apiKeys: IApiKey[];

    constructor(data?: IUser) {   
        super(data);    

        if(!this.created_at){
            this.created_at = new Date();
        }      
    }
}

//Must export default for automated DI / build work.
export default User;
```

## Relations

***Basic many to one relation***
```typescript
import { RWSCollection, RWSModel, TrackType, Relation } from '@rws-framework/db';

import 'reflect-metadata';
import User from './User';
import SomeModel from './SomeModel';
import IApiKey from './interfaces/IApiKey';

@RWSCollection('user_api_keys', {
    relations: {
        dummyIgnoredHydrationRelation: false // ignoring this relation on hydration - will be null
    }
})
class ApiKey extends RWSModel<ApiKey> implements IApiKey {

    @Relation(() => User, { requried: false }) // second attribute is required = false
    user: User;

    @Relation(() => SomeModel) // relation to be ignored by 
    dummyIgnoredHydrationRelation: SomeModel;

    @TrackType(Object)
    keyval: string;

    @TrackType(Date, { required: true })
    created_at: Date;
  
    @TrackType(Date)
    updated_at: Date;

    static _collection = 'api_keys';

    constructor(data?: IApiKey) {   
        super(data);    

        if(!this.created_at){
            this.created_at = new Date();
        }    

        this.updated_at = new Date();
    }    
}

export default ApiKey;
```

***Relation decorator*** (many-to-one)

```typescript
import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

export type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';

export interface IRelationOpts {
    required?: boolean
    key: string
    relationField: string //name of field that will hold the relation key value
    relatedToField?: string //name of related field (id by default)
    mappingName?: string
    relatedTo: OpModelType<RWSModel<any>>
    many?: boolean // is it one-to-many or many-to-one
    embed?: boolean // @deprecated for mongo - new decorator for embeds incoming
    useUuid?: boolean //for sql dbs - if you're using some text based id
    relationName?: string
    cascade?: {
        onDelete?: CascadingSetup,
        onUpdate?: CascadingSetup
    }
}

const _DEFAULTS: Partial<IRelationOpts> = { required: false, many: false, embed: false, cascade: { onDelete: 'SetNull', onUpdate: 'Cascade' }};
  
function Relation(theModel: () => OpModelType<RWSModel<any>>, relationOptions: Partial<IRelationOpts> = _DEFAULTS) {
    return function(target: any, key: string) {     
        // Store the promise in metadata immediately
        
        const metadataPromise = Promise.resolve().then(() => {            
            const relatedTo = theModel();

            const metaOpts: IRelationOpts = {
                ...relationOptions, 
                cascade: relationOptions.cascade || _DEFAULTS.cascade,
                relatedTo,
                relationField: relationOptions.relationField ? relationOptions.relationField : relatedTo._collection + '_id',
                key,
                // Generate a unique relation name if one is not provided
                relationName: relationOptions.relationName ? 
                  relationOptions.relationName.toLowerCase() : 
                  `${target.constructor.name.toLowerCase()}_${key}_${relatedTo._collection.toLowerCase()}`
            };  
            
            if(relationOptions.required){
                metaOpts.cascade.onDelete = 'Restrict';
            }

            return metaOpts;
        });

        // Store both the promise and the key information
        Reflect.defineMetadata(`Relation:${key}`, {
            promise: metadataPromise,
            key
        }, target);
    };
}


export default Relation;


```

***Inverse relation decorator*** (one-to-many)
```typescript
import 'reflect-metadata';
import { RWSModel, OpModelType } from '../models/_model';

export interface InverseRelationOpts {
    key: string,
    inversionModel: OpModelType<RWSModel<any>>
    foreignKey: string
    singular?: boolean
    relationName?: string
    mappingName?: string
}

function InverseRelation(inversionModel: () => OpModelType<RWSModel<any>>, sourceModel: () => OpModelType<RWSModel<any>>, relationOptions: Partial<InverseRelationOpts> = null) {
    return function (target: any, key: string) {
        const metadataPromise = Promise.resolve().then(() => {
            const model = inversionModel();
            const source = sourceModel();

            const metaOpts: InverseRelationOpts = {
                ...relationOptions,
                key,
                inversionModel: model,
                foreignKey: relationOptions && relationOptions.foreignKey ? relationOptions.foreignKey : `${source._collection}_id`,
                // Generate a unique relation name if one is not provided
                relationName: relationOptions && relationOptions.relationName ?
                    relationOptions.relationName.toLowerCase() :
                    `${model._collection}_${key}_${source._collection}`.toLowerCase()
            };

            return metaOpts;
        });

        // Store both the promise and the key information
        Reflect.defineMetadata(`InverseRelation:${key}`, {
            promise: metadataPromise,
            key
        }, target);
    };
}

export default InverseRelation;

```


## RWS Model to prisma conversion

### Init helper class

**This needs to be run either from the package or CLI - it changes models to prisma schema and registers it.**

*IDbConfigHandler* - An interface for config bag for DBService

```typescript
    import { OpModelType } from "../models/_model";

    export interface IDbConfigParams {
        mongo_url?: string;
        mongo_db?: string;
        db_models?: OpModelType<any>[]
    }

    export interface IDbConfigHandler {
        get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K];
    }
```

**Helper prisma install example**

```typescript
class Config implements IDbConfigHandler {
    private data: IDbConfigParams = {
        db_models: [],
        db_name: null,
        db_url: null,
        db_type: null
    };

    private modelsDir: string;
    private cliExecRoot: string;
    private static _instance: Config = null;

    private constructor(){}

    static async getInstance(): Promise<Config>
    {
        if(!this._instance){
        this._instance = new Config();
        }    

        await this._instance.fill();

        return this._instance;
    }

    
    async fill(): Promise<void>
    {
        this.data.db_url = args[0];
        this.data.db_name = args[1];    
        this.data.db_type = args[2];
        

        this.modelsDir = args[3];    
        this.cliExecRoot = args[4]; 
    }

    getModelsDir(): string
    {
        return this.modelsDir
    }

    getCliExecRoot(): string
    {
        return this.cliExecRoot
    }

    get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K] {
        return this.data[key];  
    }
    }

    async function main(): Promise<void>
    {
        console.log('INSTALL PRISMA');
        const cfg = await Config.getInstance();
        DbHelper.installPrisma(cfg, new DBService(cfg), false);
    }
```

### Init CLI
Basic CLI command that executes **generateModelSections()** from conversion script is:

**rws-db [DB_URL] [DB_NAME] [MODELS_DIRECTORY]**

The exec file.
```
/exec/src/console.js
```

dbType can be any prisma db driver - mongodb by default

```bash
#npm

npx rws-db "mongodb://user:pass@localhost:27017/databaseName?authSource=admin&replicaSet=rs0" databaseName dbType src/models
```

```bash
#yarn

yarn rws-db "mongodb://user:pass@localhost:27017/databaseName?authSource=admin&replicaSet=rs0" databaseName dbType src/models
```

```bash
#bun

bunx rws-db "mongodb://user:pass@localhost:27017/databaseName?authSource=admin&replicaSet=rs0" databaseName dbType src/models
```

Code for RWS to prisma conversion from "@rws-framework/server" package:

[The repo file](https://github.com/rws-framework/db/blob/master/src/helper/DbHelper.ts)