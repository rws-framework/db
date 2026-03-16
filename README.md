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

## TrackType decorator options & Prisma conversion

### Signature

```typescript
@TrackType(type: any, opts?: ITrackerOpts, tags?: string[])
```

### Basic type mapping

| TypeScript type | Prisma type  | Notes                                          |
|-----------------|-------------|------------------------------------------------|
| `String`        | `String`    |                                                |
| `Number`        | `Int`       | Default for numbers, overridable via `dbOptions` |
| `Boolean`       | `Boolean`   |                                                |
| `Date`          | `DateTime`  |                                                |
| `Object`        | `Json`      |                                                |
| `BigInt`        | `BigInt`    |                                                |
| `Array`         | `Json[]`    | `Json` on MySQL (no native array support)       |
| `Unsupported`   | `Unsupported("...")` | Requires `dbOptions.extraTypeParams`   |

### ITrackerOpts

```typescript
interface ITrackerOpts extends IDbOpts {
    required?: boolean;       // adds @required to Prisma field
    unique?: boolean | string; // adds @unique (string value for named index)
    isArray?: boolean;        // appends [] to the Prisma type (Json on MySQL)
    noAuto?: boolean;         // disables auto-generation behavior
}
```

### Database-specific options (IDbOpts)

Each database engine can receive its own options inside `dbOptions`:

```typescript
interface IDbOpts {
    dbOptions?: {
        mysql?: {
            useType?: string;        // Prisma native type e.g. 'db.Float', 'db.Decimal', 'db.VarChar', 'db.Unsupported'
            useText?: boolean;       // outputs @db.Text
            maxLength?: number;      // used with db.VarChar → @db.VarChar(maxLength)
            useUuid?: boolean;       // adds default(uuid()) on id fields
            params?: string[];       // type params e.g. ['10','2'] → @db.Decimal(10, 2)
            extraTypeParams?: string[]; // params for Unsupported type → Unsupported("param")
        };
        postgres?: {
            useType?: string;        // same as mysql, mapped to PG equivalents
            useText?: boolean;       // outputs @db.Text
            maxLength?: number;      // used with db.VarChar
            useUuid?: boolean;       // adds @default(uuid()) + @db.Uuid on id fields
            params?: string[];       // type params for Decimal etc.
            extraTypeParams?: string[]; // params for Unsupported type
        };
        mongodb?: {
            customType?: string;     // outputs @db.<customType>
            params?: string[];
        };
    }
}
```

> **Inheritance**: PostgreSQL options inherit from MySQL when `postgres` key is not provided. This means setting `dbOptions.mysql` is often enough for both SQL engines, and `postgres` only needs to be specified for PG-specific overrides.

### Type conversion rules

**Number overrides** — When `useType` is set on the relevant DB engine:

| `useType` value     | Prisma output (MySQL) | Prisma output (PostgreSQL)    |
|--------------------|-----------------------|-------------------------------|
| `db.Float`         | `Float`               | `Float` + `@db.Real`         |
| `db.Decimal`       | `Decimal` + `@db.Decimal(params)` | `Decimal` + `@db.Decimal(params)` |
| `db.DoublePrecision` | —                   | `Float` (PG DoublePrecision)  |
| `db.Unsupported`   | `Unsupported("...")`  | `Unsupported("...")`          |

**Unsupported type** — Use the `Unsupported` sentinel as the type argument and provide `extraTypeParams` to specify the native column type:

```typescript
import { Unsupported } from '@rws-framework/db';

// PostgreSQL pgvector column
@TrackType(Unsupported, { required: true, dbOptions: { postgres: {
    extraTypeParams: ['vector(1536)']
} } })
fragment: number[];
// → Prisma output: fragment Unsupported("vector(1536)")
```

### Examples

**Basic required field:**
```typescript
@TrackType(String, { required: true })
name: string;
// → name String
```

**Unique field:**
```typescript
@TrackType(String, { unique: true })
email: string;
// → email String @unique
```

**Boolean field:**
```typescript
@TrackType(Boolean)
active: boolean;
// → active Boolean?
```

**MySQL/PG decimal with precision:**
```typescript
@TrackType(Number, { required: true, dbOptions: { mysql: {
    useType: 'db.Decimal',
    params: ['10', '2']
} } })
price: number;
// MySQL  → price Decimal @db.Decimal(10, 2)
// PG     → price Decimal @db.Decimal(10, 2)  (inherited from mysql)
```

**Float override:**
```typescript
@TrackType(Number, { dbOptions: { mysql: { useType: 'db.Float' } } })
score: number;
// MySQL → score Float?
// PG    → score Float? @db.Real  (inherited & mapped)
```

**Text column:**
```typescript
@TrackType(String, { dbOptions: { mysql: { useText: true } } })
description: string;
// → description String? @db.Text
```

**VarChar with max length:**
```typescript
@TrackType(String, { dbOptions: { mysql: { useType: 'db.VarChar', maxLength: 500 } } })
title: string;
// MySQL → title String? @db.VarChar(500)
// PG    → title String? @db.VarChar(500)
```

**PG-specific override (different from MySQL):**
```typescript
@TrackType(Number, { dbOptions: {
    mysql: { useType: 'db.Float' },
    postgres: { useType: 'db.DoublePrecision' }
} })
measurement: number;
// MySQL → Float?
// PG    → Float?  (DoublePrecision maps to Prisma Float)
```

**Unsupported native type (pgvector):**
```typescript
@TrackType(Unsupported, { required: true, dbOptions: { postgres: {
    extraTypeParams: ['vector(1536)']
} } })
fragment: number[];
// PG → fragment Unsupported("vector(1536)")
```

**Array field:**
```typescript
@TrackType(String, { isArray: true })
tags: string[];
// PG    → tags String[]
// MySQL → tags Json  (no native array support)
```

### IdType decorator

For customizing the model's `id` field:

```typescript
@IdType(type: any, opts?: IIdTypeOpts, tags?: string[])

interface IIdTypeOpts extends IDbOpts {
    unique?: boolean | string;
    noAuto?: boolean;  // disables auto-generated id
}
```

### RWSCollection decorator

```typescript
@RWSCollection(collectionName: string, options?: IRWSCollectionOpts)

interface IRWSCollectionOpts {
    relations?: { [key: string]: boolean };   // false = skip hydration for this relation
    ignored_keys?: string[];                   // keys excluded from schema
    noId?: boolean;                            // model has no auto id field
    superTags?: ISuperTagData[];               // compound indexes etc.
}

interface ISuperTagData {
    tagType: string;       // e.g. '@@unique', '@@index'
    fields: string[];      // field names in the compound index
    fieldParams?: { [key: string]: any };
    map?: string;          // custom index name
}
```

---

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