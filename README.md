# Models

RWS models are converted to Prisma schemas and are wrapping around generated PrismaClient providing complete typing and better Relation handling + TimeSeries in future minor versions.

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
    relations: {
        transcriptions: true,
        apiKeys: true
    },
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
import { RWSModel, TrackType, Relation } from '@rws-framework/db';

import 'reflect-metadata';
import User from './User';
import IApiKey from './interfaces/IApiKey';

class ApiKey extends RWSModel<ApiKey> implements IApiKey {
    static _RELATIONS = {
        user: true,
    };

    @Relation(() => User, true) // second attribute is required = false
    user: User;

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

import { RWSModel, OpModelType } from '@rws-framework/db';

interface IRelationOpts {
    required?: boolean
    key?: string
    relationField?: string
    relatedToField?: string
    relatedTo: OpModelType<Model<any>>
}
  
function Relation(theModel: () => OpModelType<RWSModel<any>>, required: boolean = false, relationField: string = null, relatedToField: string = 'id') {
    return function(target: any, key: string) {     
        // Store the promise in metadata immediately
        const metadataPromise = Promise.resolve().then(() => {
            const relatedTo = theModel();
            const metaOpts: IRelationOpts = {required, relatedTo, relatedToField};                    
            if(!relationField){
                metaOpts.relationField = relatedTo._collection + '_id';
            } else{
                metaOpts.relationField = relationField;
            }  
            metaOpts.key = key;
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
export {IRelationOpts};
```

***Inverse relation decorator*** (one-to-many)
```typescript
import 'reflect-metadata';
import { RWSModel, OpModelType } from '@rws-framework/db';

interface InverseRelationOpts{
    key: string,
    inversionModel: OpModelType<RWSModel<any>>,
    foreignKey: string    
  }

  function InverseRelation(inversionModel: () => OpModelType<RWSModel<any>>, sourceModel: () => OpModelType<RWSModel<any>>, foreignKey: string = null) {    
    return function(target: any, key: string) {     
        // Store the promise in metadata immediately
        const metadataPromise = Promise.resolve().then(() => {
            const model = inversionModel();
            const source = sourceModel();
    
            const metaOpts: InverseRelationOpts = {
                key,
                inversionModel: model,
                foreignKey: foreignKey ? foreignKey : `${source._collection}_id`
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
export {InverseRelationOpts};
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

```typescript
static async generateModelSections(model: OpModelType<any>): Promise<string> {
    let section = '';
    const modelMetadatas: Record<string, {annotationType: string, metadata: any}> = await RWSModel.getModelAnnotations(model);    

    const modelName: string = (model as any)._collection;
    
    section += `model ${modelName} {\n`;
    section += '\tid String @map("_id") @id @default(auto()) @db.ObjectId\n';
    
    for (const key in modelMetadatas) {
        const modelMetadata = modelMetadatas[key].metadata;            
        let requiredString = modelMetadata.required ? '' : '?';  
        const annotationType: string = modelMetadatas[key].annotationType;

        if(key === 'id'){
            continue;
        }

        
        if(annotationType === 'Relation'){
            const relationMeta = modelMetadata as IRelationOpts

            const relatedModel = relationMeta.relatedTo as OpModelType<any>;  
            const isMany = relationMeta.many;
            const cascadeOpts = [];

            if (relationMeta.cascade?.onDelete) {
                cascadeOpts.push(`onDelete: ${relationMeta.cascade.onDelete}`);
            }

            if (relationMeta.cascade?.onUpdate) {
                cascadeOpts.push(`onUpdate: ${relationMeta.cascade.onUpdate}`);
            }
    
            if (isMany) {
                // Handle many-to-many or one-to-many relation
                section += `\t${key} ${relatedModel._collection}[] @relation("${modelName}_${relatedModel._collection}")\n`;
            } else {
                // Handle one-to-one or many-to-one relation
                section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${modelName}_${relatedModel._collection}", fields: [${modelMetadata.relationField}], references: [${modelMetadata.relatedToField || 'id'}], ${cascadeOpts.join(', ')})\n`;
                section += `\t${modelMetadata.relationField} String${requiredString} @db.ObjectId\n`;
            }
        } else if (annotationType === 'InverseRelation'){   
            const relationMeta = modelMetadata as InverseRelationOpts;
    
            // Handle inverse relation (one-to-many or one-to-one)
            section += `\t${key} ${relationMeta.inversionModel._collection}[] @relation("${ relationMeta.relationName ? relationMeta.relationName : `${relationMeta.inversionModel._collection}_${modelName}`}")\n`;
        } else if (annotationType === 'InverseTimeSeries'){        
            section += `\t${key} String[] @db.ObjectId\n`;      
        } else if (annotationType === 'TrackType'){        
            const tags: string[] = modelMetadata.tags.map((item: string) => '@' + item);             

            if(modelMetadata.isArray || modelMetadata.type.name === 'Array'){
                requiredString = '';
            }       
            section += `\t${key} ${DbHelper.toConfigCase(modelMetadata)}${requiredString} ${tags.join(' ')}\n`;
        }
    }
    
    section += '}\n';
    return section;
}

static toConfigCase(modelType: IMetaOpts): string {
    const type = modelType.type;
    let input = type.name;    
    

    if(input == 'Number'){
        input = 'Int';
    }

    if(input == 'Object'){
        input = 'Json';
    }

    if(input == 'Date'){
        input = 'DateTime';
    }

    if(input == 'Array'){
        input = 'Json[]';
    }

    const firstChar = input.charAt(0).toUpperCase();
    const restOfString = input.slice(1);
    let resultField = firstChar + restOfString;

    if(modelType.isArray){
        resultField += '[]';
    }

    return resultField;
}
```