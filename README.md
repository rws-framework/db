# @rws-framework/db

`@rws-framework/db` turns TypeScript model classes into a Prisma schema and wraps the generated Prisma Client with automatic relation hydration, time-series helpers, and a consistent model API.

## Table of contents

1. [Installation & setup](#installation--setup)
2. [Model index file](#model-index-file)
3. [A minimal model](#a-minimal-model)
4. [Decorators](#decorators)
   - [`@RWSCollection`](#rwscollection-decorator)
   - [`@TrackType`](#tracktype-decorator)
   - [`@IdType`](#idtype-decorator)
   - [`@Relation`](#relation-decorator)
   - [`@InverseRelation`](#inverserelation-decorator)
   - [`@InverseTimeSeries`](#inversetimeseries-decorator)
5. [Database-specific options (`dbOptions`)](#database-specific-options-dboptions)
6. [Indexes](#indexes)
7. [RWSModel API](#rwsmodel-api)
8. [Database configuration](#database-configuration)
9. [CLI](#cli)
10. [Type conversion reference](#type-conversion-reference)

---

## Installation & setup

Install the package together with its peer dependencies (`reflect-metadata` is required for decorators):

```bash
npm install @rws-framework/db reflect-metadata
# or
yarn add @rws-framework/db reflect-metadata
```

Import `reflect-metadata` once at the entry point of your application:

```typescript
import 'reflect-metadata';
```

---

## Model index file

The framework needs a list of every model class. Create an index file that exports them in an array:

```typescript
// src/models/index.ts
import User from './User';
import ApiKey from './ApiKey';
import Product from './Product';

export const models = [User, ApiKey, Product];
```

Pass that array to your configuration service as `db_models` (see [Database configuration](#database-configuration)).

---

## A minimal model

```typescript
import 'reflect-metadata';
import { RWSModel, RWSCollection, TrackType, InverseRelation } from '@rws-framework/db';
import ApiKey from './ApiKey';

@RWSCollection('users', {
  ignored_keys: ['passwd']
})
class User extends RWSModel<User> {
  @TrackType(String)
  username: string;

  @TrackType(String)
  passwd: string;

  @TrackType(Boolean)
  active: boolean;

  @TrackType(Date, { required: true })
  created_at: Date;

  @TrackType(Date)
  updated_at: Date;

  @InverseRelation(() => ApiKey, () => User)
  apiKeys: ApiKey[];

  constructor(data?: Partial<User>) {
    super(data);

    if (!this.created_at) {
      this.created_at = new Date();
    }
  }
}

export default User;
```

Every model must:

- extend `RWSModel<T>`,
- be decorated with `@RWSCollection`,
- export the class as `default`,
- import `reflect-metadata`.

---

## Decorators


### `@RWSCollection` decorator

Configures the Prisma model name and model-level behavior.

```typescript
@RWSCollection(collectionName: string, options?: IRWSCollectionOpts)
```

```typescript
interface IRWSCollectionOpts {
  relations?: { [key: string]: boolean }; // false disables hydration for that relation
  ignored_keys?: string[];                // fields excluded from the Prisma schema
  noId?: boolean;                         // model has no auto-generated id field
  superTags?: ISuperTagData[];            // model-level Prisma attributes
}

interface ISuperTagData {
  tagType: string;       // Prisma attribute name without @@, e.g. 'unique', 'index', 'id', 'map'
  fields: string[];      // field names in the attribute
  fieldParams?: { [key: string]: any }; // per-field arguments
  map?: string;          // custom constraint / index name
}
```

`superTags` are rendered as `@@<tagType>([<fields>], map: "...")` in the generated Prisma model. Common values for `tagType`:

| `tagType` | Generated Prisma | Purpose |
|-----------|------------------|---------|
| `unique` | `@@unique([...])` | Multi-column unique constraint |
| `index` | `@@index([...])` | Multi-column index |
| `id` | `@@id([...])` | Composite primary key (use with `noId: true`) |
| `map` | `@@map("...")` | Custom table / collection name |

Each entry in `fields` can be:

- a decorated property name (the generator resolves `@Relation` fields to their foreign-key column),
- a field with arguments, e.g. `username(length: 191)` when `fieldParams` is used.

Example:

```typescript
@RWSCollection('user_api_keys', {
  relations: { dummyIgnoredHydrationRelation: false },
  ignored_keys: ['internal_note'],
  superTags: [
    { tagType: 'unique', fields: ['user_id', 'keyval'], map: 'user_key_unique' }
  ]
})
class ApiKey extends RWSModel<ApiKey> { /* ... */ }
```

Composite primary key:

```typescript
@RWSCollection('order_items', { noId: true })
class OrderItem extends RWSModel<OrderItem> {
  @TrackType(String)
  order_id: string;

  @TrackType(String)
  product_id: string;

  @TrackType(Number)
  quantity: number;
}
// Renders: @@id([order_id, product_id])
```

Multi-column index with named map:

```typescript
@RWSCollection('events', {
  superTags: [
    { tagType: 'index', fields: ['created_at', 'type'], map: 'events_created_at_type_idx' }
  ]
})
class Event extends RWSModel<Event> { /* ... */ }
```

---

### `@TrackType` decorator

Marks a property as a database field.

```typescript
@TrackType(type: any, opts?: ITrackerOpts, tags?: string[])
```

#### Supported types

| TypeScript type | Prisma type | Notes |
|-----------------|-------------|-------|
| `String` | `String` | |
| `Number` | `Int` | Override with `dbOptions.useType` |
| `Boolean` | `Boolean` | |
| `Date` | `DateTime` | |
| `Object` | `Json` | |
| `BigInt` | `BigInt` | |
| `Array` | `Json[]` | `Json` on MySQL |
| `Unsupported` | `Unsupported("...")` | Requires `dbOptions.extraTypeParams` |

#### `ITrackerOpts`

```typescript
interface ITrackerOpts extends IDbOpts {
  required?: boolean;        // field is non-nullable
  unique?: boolean | string; // true = @unique, string = @unique(map: "name")
  isArray?: boolean;         // array type
  relationField?: string;    // internal relation key name
  relatedToField?: string;   // referenced field (default "id")
  relatedTo?: OpModelType<any>;
  inversionModel?: OpModelType<any>;
  relationName?: string;
  foreignKey?: string;
  noAuto?: boolean;
  singular?: boolean;
}
```

#### `IDbOpts`

`ITrackerOpts` extends `IDbOpts`, so every `@TrackType` option can carry database-specific native type settings. See the dedicated [Database-specific options (`dbOptions`)](#database-specific-options-dboptions) section for the full reference.

#### Number overrides

| `useType` | MySQL output | PostgreSQL output |
|-----------|--------------|-------------------|
| `db.Float` | `Float` | `Float @db.Real` |
| `db.Decimal` | `Decimal @db.Decimal(...)` | `Decimal @db.Decimal(...)` |
| `db.DoublePrecision` | — | `Float` |
| `db.Unsupported` | `Unsupported("...")` | `Unsupported("...")` |

#### Examples

**Required field:**

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

**Decimal with precision:**

```typescript
@TrackType(Number, {
  required: true,
  dbOptions: {
    mysql: { useType: 'db.Decimal', params: ['10', '2'] }
  }
})
price: number;
// → price Decimal @db.Decimal(10, 2)
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
// → title String? @db.VarChar(500)
```

See the [Database-specific options (`dbOptions`)](#database-specific-options-dboptions) section for the full option reference.

**PostgreSQL-specific override:**

```typescript
@TrackType(Number, {
  dbOptions: {
    mysql: { useType: 'db.Float' },
    postgres: { useType: 'db.DoublePrecision' }
  }
})
measurement: number;
// MySQL → Float?
// PG    → Float?
```

**Unsupported native type (e.g. pgvector):**

```typescript
import { Unsupported } from '@rws-framework/db';

@TrackType(Unsupported, {
  required: true,
  dbOptions: { postgres: { extraTypeParams: ['vector(1536)'] } }
})
fragment: number[];
// → fragment Unsupported("vector(1536)")
```

See the [Database-specific options (`dbOptions`)](#database-specific-options-dboptions) section for the full option reference.

**Array field:**

```typescript
@TrackType(String, { isArray: true })
tags: string[];
// PostgreSQL → tags String[]
// MySQL      → tags Json
```

#### Field-level indexes and constraints

Use the `unique` option to add a single-field index or constraint:

```typescript
@TrackType(String, { unique: true })
email: string;
// → email String? @unique
```

Provide a string to name the underlying constraint map:

```typescript
@TrackType(String, { unique: 'user_email_unique' })
email: string;
// → email String? @unique(map: "user_email_unique")
```

This is the simplest way to index one column. For multi-column indexes or constraints, use `@RWSCollection` `superTags`.

---

### `@IdType` decorator

Customizes the model's primary key. If omitted, `RWSModel` already defines a default `id` field.

```typescript
@IdType(type?: any, opts?: IIdTypeOpts, tags?: string[])
```

```typescript
interface IIdTypeOpts extends IDbOpts {
  unique?: boolean | string;
  noAuto?: boolean; // disables auto-generated id
}
```

Example:

```typescript
@RWSCollection('orders', { noId: true })
class Order extends RWSModel<Order> {
  @IdType(String, { dbOptions: { postgres: { useUuid: true } } })
  order_number: string;
}
```

---

### `@Relation` decorator

Defines a many-to-one relation (the foreign-key owner).

```typescript
@Relation(modelFactory: () => OpModelType<any>, opts?: Partial<IRelationOpts>)
```

```typescript
export type CascadingSetup = 'Cascade' | 'Restrict' | 'NoAction' | 'SetNull';

export interface IRelationOpts {
  required?: boolean;
  key: string;
  relationField: string;     // FK column name, default "<related_collection>_id"
  relatedToField?: string;   // referenced field, default "id"
  mappingName?: string;      // Prisma relation map name
  relatedTo: OpModelType<RWSModel<any>>;
  many?: boolean;            // one-to-many from this side
  embed?: boolean;           // @deprecated
  useUuid?: boolean;         // use UUID FK for SQL databases
  relationName?: string;     // explicit Prisma relation name
  cascade?: {
    onDelete?: CascadingSetup;
    onUpdate?: CascadingSetup;
  };
}
```

Defaults:

```typescript
const _DEFAULTS: Partial<IRelationOpts> = {
  required: false,
  many: false,
  embed: false,
  cascade: { onDelete: 'SetNull', onUpdate: 'Cascade' }
};
```

> **Circular dependencies**: pass the related model as an arrow function (`() => User`) so modules can load in any order.

Example:

```typescript
@RWSCollection('api_keys')
class ApiKey extends RWSModel<ApiKey> {
  @Relation(() => User, { required: false })
  user: User;

  @TrackType(String)
  keyval: string;
}
```

This generates a `user_id` foreign key and a Prisma relation.

---

### `@InverseRelation` decorator

Defines the inverse side of a relation (one-to-many or one-to-one).

```typescript
@InverseRelation(
  inversionModelFactory: () => OpModelType<any>,
  sourceModelFactory: () => OpModelType<any>,
  opts?: Partial<InverseRelationOpts>
)
```

```typescript
interface InverseRelationOpts {
  key: string;
  inversionModel: OpModelType<RWSModel<any>>;
  foreignKey: string;              // FK column on the inversion model
  singular?: boolean;              // one-to-one inverse
  relationName?: string;
  mappingName?: string;
  orderBy?: { [field: string]: 'asc' | 'desc' };
}
```

Example:

```typescript
@RWSCollection('users')
class User extends RWSModel<User> {
  @InverseRelation(() => ApiKey, () => User)
  apiKeys: ApiKey[];
}
```

If the inversion model has only one relation back to the source model, the FK is guessed automatically as `<source_collection>_id`.

---

### `@InverseTimeSeries` decorator

Links a field to a MongoDB time-series collection.

```typescript
@InverseTimeSeries(timeSeriesModel: string, hydrationField: string)
```

The related model should extend `TimeSeriesModel<T>`:

```typescript
import { TimeSeriesModel, TrackType } from '@rws-framework/db';

class PricePoint extends TimeSeriesModel<PricePoint> {
  @TrackType(Number) value: number;
  @TrackType(Date) timestamp: Date;
  @TrackType(Object) params: any;
}
```

Usage on a parent model:

```typescript
@RWSCollection('products')
class Product extends RWSModel<Product> {
  @InverseTimeSeries('PricePoint', 'price_history')
  price_points: string[];

  @TrackType(Object)
  price_history: PricePoint[];
}
```

Time-series models must be instantiated with the static `create()` method because the synchronous constructor does not support them:

```typescript
const point = await PricePoint.create({ value: 12.99, params: { product_id: product.id } });
```


---

## Database-specific options (`dbOptions`)

`dbOptions` lets you control the native database type rendered for a field. It is available on `@TrackType`, `@IdType`, and any other decorator that extends `IDbOpts`.

```typescript
interface IDbOpts {
  dbOptions?: {
    mysql?: MySqlDbOptions;
    postgres?: PostgresDbOptions;
    mongodb?: MongoDbOptions;
  };
}
```

> **PostgreSQL inheritance**: when the `postgres` key is absent, PostgreSQL falls back to the `mysql` options. Specify `postgres` only for PostgreSQL-specific overrides.

### MySQL options

```typescript
interface MySqlDbOptions {
  useType?: string;           // native Prisma type, e.g. 'db.Float', 'db.Decimal', 'db.VarChar', 'db.Unsupported'
  useText?: boolean;          // renders @db.Text
  maxLength?: number;         // used with db.VarChar → @db.VarChar(maxLength)
  useUuid?: boolean;          // on @IdType fields: makes the id a UUID with default(uuid())
  params?: string[];          // positional type arguments, e.g. ['10','2'] → @db.Decimal(10, 2)
  extraTypeParams?: string[]; // quoted arguments for Unsupported("...")
}
```

| Option | Effect |
|--------|--------|
| `useType` | Overrides the Prisma scalar type with a native MySQL type. Accepted values: `db.Float`, `db.Decimal`, `db.VarChar`, `db.Unsupported`. |
| `useText` | Adds `@db.Text` to a `String` field. |
| `maxLength` | Adds `@db.VarChar(maxLength)` to a `String` field. |
| `useUuid` | On an `@IdType` / `id` field, switches the id strategy to UUID (`default(uuid())`). |
| `params` | Positional arguments passed to the native type, e.g. `['10', '2']` → `@db.Decimal(10, 2)`. |
| `extraTypeParams` | Quoted arguments for `@db.Unsupported("...")`, e.g. `['vector(1536)']`. |

### PostgreSQL options

```typescript
interface PostgresDbOptions {
  useType?: string;           // same semantics as mysql; inherits from mysql when omitted
  useText?: boolean;          // renders @db.Text
  maxLength?: number;         // used with db.VarChar
  useUuid?: boolean;          // on @IdType fields: @default(uuid()) @db.Uuid
  params?: string[];          // positional type arguments
  extraTypeParams?: string[]; // quoted arguments for Unsupported("...")
}
```

| Option | Effect |
|--------|--------|
| `useType` | Overrides the Prisma scalar type with a native PostgreSQL type. Accepted values: `db.Float`, `db.Decimal`, `db.VarChar`, `db.DoublePrecision`, `db.Unsupported`. |
| `useText` | Adds `@db.Text` to a `String` field. |
| `maxLength` | Adds `@db.VarChar(maxLength)` to a `String` field. |
| `useUuid` | On an `@IdType` / `id` field, switches the id strategy to UUID (`@default(uuid()) @db.Uuid`). |
| `params` | Positional arguments passed to the native type, e.g. `['10', '2']` → `@db.Decimal(10, 2)`. |
| `extraTypeParams` | Quoted arguments for `@db.Unsupported("...")`, e.g. `['vector(1536)']`. |

### MongoDB options

```typescript
interface MongoDbOptions {
  customType?: string;        // renders @db.<customType>, e.g. 'ObjectId'
  params?: string[];          // extra params for the custom type
}
```

| Option | Effect |
|--------|--------|
| `customType` | Adds `@db.<customType>` to a field, e.g. `ObjectId`. |
| `params` | Extra parameters for the custom type. |

### Examples

**MySQL `db.VarChar` with max length:**

```typescript
@TrackType(String, { dbOptions: { mysql: { useType: 'db.VarChar', maxLength: 255 } } })
slug: string;
// → slug String? @db.VarChar(255)
```

**MySQL `db.Text`:**

```typescript
@TrackType(String, { dbOptions: { mysql: { useText: true } } })
body: string;
// → body String? @db.Text
```

**MySQL `db.Decimal` with precision:**

```typescript
@TrackType(Number, { dbOptions: { mysql: { useType: 'db.Decimal', params: ['10', '2'] } } })
price: number;
// → price Int? @db.Decimal(10, 2)
```

**MySQL `db.Float`:**

```typescript
@TrackType(Number, { dbOptions: { mysql: { useType: 'db.Float' } } })
rating: number;
// → rating Float?
```

**PostgreSQL-specific override:**

```typescript
@TrackType(Number, {
  dbOptions: {
    mysql: { useType: 'db.Float' },
    postgres: { useType: 'db.DoublePrecision' }
  }
})
measurement: number;
// MySQL → Float?
// PG    → Float?
```

**Unsupported native type (e.g. pgvector):**

```typescript
import { Unsupported } from '@rws-framework/db';

@TrackType(Unsupported, {
  dbOptions: { postgres: { extraTypeParams: ['vector(1536)'] } }
})
fragment: number[];
// → fragment Unsupported("vector(1536)")
```

**MongoDB `ObjectId` reference:**

```typescript
@TrackType(String, { dbOptions: { mongodb: { customType: 'ObjectId' } } })
external_id: string;
// → external_id String? @db.ObjectId
```

---

## Indexes

### Single-field index

Apply `@unique` to a tracked field through `ITrackerOpts.unique`:

```typescript
@TrackType(String, { unique: true })
email: string;
// → email String? @unique
```

Name the underlying constraint map:

```typescript
@TrackType(String, { unique: 'users_email_unique' })
email: string;
// → email String? @unique(map: "users_email_unique")
```

### Compound indexes and constraints

Use `superTags` inside `@RWSCollection`:

```typescript
@RWSCollection('user_api_keys', {
  superTags: [
    { tagType: 'unique', fields: ['user_id', 'keyval'], map: 'user_api_key_unique' },
    { tagType: 'index', fields: ['created_at'], map: 'user_api_key_created_idx' }
  ]
})
class ApiKey extends RWSModel<ApiKey> { /* ... */ }
```

The generator resolves decorated relation fields to their foreign-key columns automatically, so you can use the property name:

```typescript
@RWSCollection('posts', {
  superTags: [
    { tagType: 'index', fields: ['author', 'published_at'] }
  ]
})
class Post extends RWSModel<Post> {
  @Relation(() => User)
  author: User;
  // Generates FK column author_id and @@index([author_id])
}
```

### Composite primary key

Set `noId: true` and add a `@@id` super tag:

```typescript
@RWSCollection('memberships', { noId: true })
class Membership extends RWSModel<Membership> {
  @TrackType(String) user_id: string;
  @TrackType(String) group_id: string;
}
// Renders:
// model memberships {
//   user_id  String
//   group_id String
//   @@id([user_id, group_id])
// }
```

---

## RWSModel API

### Instance methods

| Method | Description |
|--------|-------------|
| `async save(): Promise<this>` | Inserts or updates the record. |
| `async reload(): Promise<this \| null>` | Reloads the record from the database with relations. |
| `async delete(): Promise<void>` | Deletes the record by its primary key. |
| `getDb(): DBService` | Returns the configured `DBService`. |
| `getCollection(): string \| null` | Returns the Prisma model name. |
| `async isDbVariable(name: string): Promise<boolean>` | Checks whether a property is a tracked DB field. |

### Static methods

| Method | Description |
|--------|-------------|
| `static async create<T>(data: any): Promise<T>` | Creates a hydrated model instance without saving. |
| `static async find<T>(id: string \| number, params?): Promise<T \| null>` | Finds by primary key. |
| `static async findOneBy<T>(params?: FindByType): Promise<T \| null>` | Finds one record matching conditions. |
| `static async findBy<T>(params?: FindByType): Promise<T[]>` | Finds many records. |
| `static async paginate<T>(paginateParams, findParams?): Promise<T[]>` | Paginated find. |
| `static async delete<T>(conditions: any): Promise<void>` | Deletes many records. |
| `static async count<T>(where?: object): Promise<number>` | Counts matching records. |
| `static setServices(services: IRWSModelServices)` | Injects config and DB services. |
| `static loadModels(): OpModelType<any>[]` | Returns the registered model list. |

### `FindByType`

```typescript
type FindByType = {
  conditions?: any;
  ordering?: OrderByType;
  fields?: string[];        // restrict returned fields
  allowRelations?: boolean; // preload relations, default true
  fullData?: boolean;       // include ignored keys
  pagination?: IPaginationParams;
  cancelPostLoad?: boolean; // skip postLoad hook
};

interface IPaginationParams {
  page: number;
  per_page?: number;
}
```

---

## Database configuration

Provide a config object implementing `IDbConfigHandler`:

```typescript
import { IDbConfigHandler, IDbConfigParams } from '@rws-framework/db';

class Config implements IDbConfigHandler {
  private data: IDbConfigParams = {
    db_url: process.env.DB_URL,
    db_name: process.env.DB_NAME,
    db_type: 'mongodb', // 'mongodb' | 'mysql' | 'sqlite' | 'postgresql' | 'postgres'
    db_models: [],
    db_preview_features: [],
    db_extensions: [],
    db_prisma_output: undefined,
    db_prisma_binary_targets: []
  };

  get<K extends keyof IDbConfigParams>(key: K): IDbConfigParams[K] {
    return this.data[key];
  }
}
```

Then initialize the framework:

```typescript
import { DBService, DbHelper, RWSModel } from '@rws-framework/db';
import { models } from './models';

async function bootstrap() {
  const config = new Config();
  config['data'].db_models = models; // or set inside the class

  const dbService = new DBService(config);
  RWSModel.setServices({ configService: config, dbService });

  await DbHelper.installPrisma(config, dbService);
  await DbHelper.postSchemaGenerate(config);
}
```

### `IDbConfigParams`

```typescript
interface IDbConfigParams {
  db_url?: string;
  db_name?: string;
  db_preview_features?: string[];
  db_extensions?: string[];
  db_type?: 'mongodb' | 'mysql' | 'sqlite' | 'postgresql' | 'postgres';
  db_models?: OpModelType<any>[];
  db_prisma_output?: string;
  db_prisma_binary_targets?: string[];
}
```

---

## CLI

The package exposes a CLI that generates and pushes the Prisma schema.

```bash
npx rws-db  <db_url> <db_name> <db_type> <models_directory>
```

Examples:

```bash
# npm
npx rws-db "mongodb://user:pass@localhost:27017/db?authSource=admin&replicaSet=rs0" mydb mongodb src/models

# yarn
yarn rws-db "postgresql://user:pass@localhost:5432/mydb" mydb postgresql src/models

# bun
bunx rws-db "mysql://user:pass@localhost:3306/mydb" mydb mysql src/models
```

---

## Type conversion reference

| TypeScript | Prisma | MySQL note | PostgreSQL note |
|------------|--------|------------|-----------------|
| `String` | `String` | | |
| `Number` | `Int` | Override via `useType` | Inherits MySQL overrides unless `postgres` is set |
| `Boolean` | `Boolean` | | |
| `Date` | `DateTime` | | |
| `Object` | `Json` | | |
| `BigInt` | `BigInt` | | |
| `Array` | `Json[]` | Stored as `Json` | Native array |
| `Unsupported` | `Unsupported("...")` | Use `extraTypeParams` | Use `extraTypeParams` |

---

## More examples

See the source files in the repository:

- [`src/helper/DbHelper.ts`](https://github.com/rws-framework/db/blob/master/src/helper/DbHelper.ts)
- [`src/models/core/RWSModel.ts`](https://github.com/rws-framework/db/blob/master/src/models/core/RWSModel.ts)
