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
    import { RWSannotations, RWSModel } from '@rws-framework/server';

import IUser from './interfaces/IUser';
import 'reflect-metadata';

import ApiKey from './ApiKey';
import IApiKey from './interfaces/IApiKey';
const { RWSTrackType, InverseRelation } = RWSannotations.modelAnnotations;

class User extends RWSModel<User> implements IUser {
    @RWSTrackType(String)
    username: string;

    @RWSTrackType(String) // Can also handle Object and Number
    passwd: string;

    @RWSTrackType(Boolean)
    active: boolean;

    @RWSTrackType(Date, { required: true })
    created_at: Date;
  
    @RWSTrackType(Date)
    updated_at: Date;

    /**
     * Every relation and inverse relation decorator 
     * uses arrow function model passing
     **/
    @InverseRelation(() => ApiKey, () => User)
    apiKeys: IApiKey[];

    static _collection = 'user';

    static _RELATIONS = {
        transcriptions: true,
        apiKeys: true
    };

    static _CUT_KEYS = ['passwd'];

    constructor(data?: IUser) {   
        super(data);    

        if(!this.created_at){
            this.created_at = new Date();
        }      
    }    

    addMessage(message: string){
        this.messages.push(message);
    }
}

//Must export default for automated DI / build work.
export default User;
```

## Relations

***Basic many to one relation***
```typescript
import { RWSannotations, RWSModel } from '@rws-framework/server';

import 'reflect-metadata';
import User from './User';
import IApiKey from './interfaces/IApiKey';
const { RWSTrackType, Relation } = RWSannotations.modelAnnotations;

class ApiKey extends RWSModel<ApiKey> implements IApiKey {
    static _RELATIONS = {
        user: true,
    };

    @Relation(() => User, true) // second attribute is required = false
    user: User;

    @RWSTrackType(Object)
    keyval: string;

    @RWSTrackType(Date, { required: true })
    created_at: Date;
  
    @RWSTrackType(Date)
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
import Model, { OpModelType } from '../_model';

interface IRelationOpts {
    required?: boolean
    key?: string
    relationField?: string
    relatedToField?: string
    relatedTo: OpModelType<Model<any>>
}
  
function Relation(theModel: () => OpModelType<Model<any>>, required: boolean = false, relationField: string = null, relatedToField: string = 'id') {
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
import Model, { OpModelType } from '../_model';

interface InverseRelationOpts{
    key: string,
    inversionModel: OpModelType<Model<any>>,
    foreignKey: string    
  }

  function InverseRelation(inversionModel: () => OpModelType<Model<any>>, sourceModel: () => OpModelType<Model<any>>, foreignKey: string = null) {    
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


### Init CLI
Basic CLI command that executes **generateModelSections()** from conversion script is 

```bash
yarn rws init
```


Code for RWS to prisma conversion from "@rws-framework/server" package:

```typescript
async function generateModelSections<T extends Model<T>>(model: OpModelType<T>): Promise<string> {
    let section = '';
    const modelMetadatas: Record<string, {annotationType: string, metadata: any}> = await Model.getModelAnnotations(model);    

    const modelName: string = (model as any)._collection;
    
    section += `model ${modelName} {\n`;
    section += '\tid String @map("_id") @id @default(auto()) @db.ObjectId\n';
 
    for (const key in modelMetadatas) {
        const modelMetadata: IMetaOpts = modelMetadatas[key].metadata;            
        const requiredString = modelMetadata.required ? '' : '?';  
        const annotationType: string = modelMetadatas[key].annotationType;

        if(key === 'id'){
            continue;
        }
        
        if(annotationType === 'Relation'){
            const relatedModel = modelMetadata.relatedTo as OpModelType<T>;        
            // Handle direct relation (many-to-one or one-to-one)
            section += `\t${key} ${relatedModel._collection}${requiredString} @relation("${modelName}_${relatedModel._collection}", fields: [${modelMetadata.relationField}], references: [${modelMetadata.relatedToField}], onDelete: Cascade)\n`;      
            section += `\t${modelMetadata.relationField} String${requiredString} @db.ObjectId\n`;
        } else if (annotationType === 'InverseRelation'){        
            // Handle inverse relation (one-to-many or one-to-one)
            section += `\t${key} ${modelMetadata.inversionModel._collection}[] @relation("${modelMetadata.inversionModel._collection}_${modelName}")\n`;
        } else if (annotationType === 'InverseTimeSeries'){        
            section += `\t${key} String[] @db.ObjectId\n`;      
        } else if (annotationType === 'TrackType'){        
            const tags: string[] = modelMetadata.tags.map((item: string) => '@' + item);          
            section += `\t${key} ${toConfigCase(modelMetadata)}${requiredString} ${tags.join(' ')}\n`;
        }
    }
    
    section += '}\n';
    return section;
}

function toConfigCase(modelType: any): string {
    const type = modelType.type;
    const input = type.name;  

    if(input == 'Number'){
        return 'Int';
    }

    if(input == 'Object'){
        return 'Json';
    }

    if(input == 'Date'){
        return 'DateTime';
    }


    const firstChar = input.charAt(0).toUpperCase();
    const restOfString = input.slice(1);
    return firstChar + restOfString;
}
```