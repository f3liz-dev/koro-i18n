
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model OauthState
 * 
 */
export type OauthState = $Result.DefaultSelection<Prisma.$OauthStatePayload>
/**
 * Model ProjectFile
 * 
 */
export type ProjectFile = $Result.DefaultSelection<Prisma.$ProjectFilePayload>
/**
 * Model Translation
 * 
 */
export type Translation = $Result.DefaultSelection<Prisma.$TranslationPayload>
/**
 * Model TranslationHistory
 * 
 */
export type TranslationHistory = $Result.DefaultSelection<Prisma.$TranslationHistoryPayload>
/**
 * Model Project
 * 
 */
export type Project = $Result.DefaultSelection<Prisma.$ProjectPayload>
/**
 * Model ProjectMember
 * 
 */
export type ProjectMember = $Result.DefaultSelection<Prisma.$ProjectMemberPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.oauthState`: Exposes CRUD operations for the **OauthState** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OauthStates
    * const oauthStates = await prisma.oauthState.findMany()
    * ```
    */
  get oauthState(): Prisma.OauthStateDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.projectFile`: Exposes CRUD operations for the **ProjectFile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProjectFiles
    * const projectFiles = await prisma.projectFile.findMany()
    * ```
    */
  get projectFile(): Prisma.ProjectFileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.translation`: Exposes CRUD operations for the **Translation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Translations
    * const translations = await prisma.translation.findMany()
    * ```
    */
  get translation(): Prisma.TranslationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.translationHistory`: Exposes CRUD operations for the **TranslationHistory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TranslationHistories
    * const translationHistories = await prisma.translationHistory.findMany()
    * ```
    */
  get translationHistory(): Prisma.TranslationHistoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.project`: Exposes CRUD operations for the **Project** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Projects
    * const projects = await prisma.project.findMany()
    * ```
    */
  get project(): Prisma.ProjectDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.projectMember`: Exposes CRUD operations for the **ProjectMember** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProjectMembers
    * const projectMembers = await prisma.projectMember.findMany()
    * ```
    */
  get projectMember(): Prisma.ProjectMemberDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.0
   * Query Engine version: 2ba551f319ab1df4bc874a89965d8b3641056773
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    OauthState: 'OauthState',
    ProjectFile: 'ProjectFile',
    Translation: 'Translation',
    TranslationHistory: 'TranslationHistory',
    Project: 'Project',
    ProjectMember: 'ProjectMember'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "oauthState" | "projectFile" | "translation" | "translationHistory" | "project" | "projectMember"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      OauthState: {
        payload: Prisma.$OauthStatePayload<ExtArgs>
        fields: Prisma.OauthStateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OauthStateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OauthStateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>
          }
          findFirst: {
            args: Prisma.OauthStateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OauthStateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>
          }
          findMany: {
            args: Prisma.OauthStateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>[]
          }
          create: {
            args: Prisma.OauthStateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>
          }
          createMany: {
            args: Prisma.OauthStateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OauthStateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>[]
          }
          delete: {
            args: Prisma.OauthStateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>
          }
          update: {
            args: Prisma.OauthStateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>
          }
          deleteMany: {
            args: Prisma.OauthStateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OauthStateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.OauthStateUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>[]
          }
          upsert: {
            args: Prisma.OauthStateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OauthStatePayload>
          }
          aggregate: {
            args: Prisma.OauthStateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOauthState>
          }
          groupBy: {
            args: Prisma.OauthStateGroupByArgs<ExtArgs>
            result: $Utils.Optional<OauthStateGroupByOutputType>[]
          }
          count: {
            args: Prisma.OauthStateCountArgs<ExtArgs>
            result: $Utils.Optional<OauthStateCountAggregateOutputType> | number
          }
        }
      }
      ProjectFile: {
        payload: Prisma.$ProjectFilePayload<ExtArgs>
        fields: Prisma.ProjectFileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProjectFileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProjectFileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>
          }
          findFirst: {
            args: Prisma.ProjectFileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProjectFileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>
          }
          findMany: {
            args: Prisma.ProjectFileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>[]
          }
          create: {
            args: Prisma.ProjectFileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>
          }
          createMany: {
            args: Prisma.ProjectFileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProjectFileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>[]
          }
          delete: {
            args: Prisma.ProjectFileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>
          }
          update: {
            args: Prisma.ProjectFileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>
          }
          deleteMany: {
            args: Prisma.ProjectFileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProjectFileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProjectFileUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>[]
          }
          upsert: {
            args: Prisma.ProjectFileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectFilePayload>
          }
          aggregate: {
            args: Prisma.ProjectFileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProjectFile>
          }
          groupBy: {
            args: Prisma.ProjectFileGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProjectFileGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProjectFileCountArgs<ExtArgs>
            result: $Utils.Optional<ProjectFileCountAggregateOutputType> | number
          }
        }
      }
      Translation: {
        payload: Prisma.$TranslationPayload<ExtArgs>
        fields: Prisma.TranslationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TranslationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TranslationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>
          }
          findFirst: {
            args: Prisma.TranslationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TranslationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>
          }
          findMany: {
            args: Prisma.TranslationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>[]
          }
          create: {
            args: Prisma.TranslationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>
          }
          createMany: {
            args: Prisma.TranslationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TranslationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>[]
          }
          delete: {
            args: Prisma.TranslationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>
          }
          update: {
            args: Prisma.TranslationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>
          }
          deleteMany: {
            args: Prisma.TranslationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TranslationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TranslationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>[]
          }
          upsert: {
            args: Prisma.TranslationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationPayload>
          }
          aggregate: {
            args: Prisma.TranslationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTranslation>
          }
          groupBy: {
            args: Prisma.TranslationGroupByArgs<ExtArgs>
            result: $Utils.Optional<TranslationGroupByOutputType>[]
          }
          count: {
            args: Prisma.TranslationCountArgs<ExtArgs>
            result: $Utils.Optional<TranslationCountAggregateOutputType> | number
          }
        }
      }
      TranslationHistory: {
        payload: Prisma.$TranslationHistoryPayload<ExtArgs>
        fields: Prisma.TranslationHistoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TranslationHistoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TranslationHistoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>
          }
          findFirst: {
            args: Prisma.TranslationHistoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TranslationHistoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>
          }
          findMany: {
            args: Prisma.TranslationHistoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>[]
          }
          create: {
            args: Prisma.TranslationHistoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>
          }
          createMany: {
            args: Prisma.TranslationHistoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TranslationHistoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>[]
          }
          delete: {
            args: Prisma.TranslationHistoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>
          }
          update: {
            args: Prisma.TranslationHistoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>
          }
          deleteMany: {
            args: Prisma.TranslationHistoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TranslationHistoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TranslationHistoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>[]
          }
          upsert: {
            args: Prisma.TranslationHistoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TranslationHistoryPayload>
          }
          aggregate: {
            args: Prisma.TranslationHistoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTranslationHistory>
          }
          groupBy: {
            args: Prisma.TranslationHistoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<TranslationHistoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.TranslationHistoryCountArgs<ExtArgs>
            result: $Utils.Optional<TranslationHistoryCountAggregateOutputType> | number
          }
        }
      }
      Project: {
        payload: Prisma.$ProjectPayload<ExtArgs>
        fields: Prisma.ProjectFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProjectFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProjectFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          findFirst: {
            args: Prisma.ProjectFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProjectFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          findMany: {
            args: Prisma.ProjectFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>[]
          }
          create: {
            args: Prisma.ProjectCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          createMany: {
            args: Prisma.ProjectCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProjectCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>[]
          }
          delete: {
            args: Prisma.ProjectDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          update: {
            args: Prisma.ProjectUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          deleteMany: {
            args: Prisma.ProjectDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProjectUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProjectUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>[]
          }
          upsert: {
            args: Prisma.ProjectUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectPayload>
          }
          aggregate: {
            args: Prisma.ProjectAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProject>
          }
          groupBy: {
            args: Prisma.ProjectGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProjectGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProjectCountArgs<ExtArgs>
            result: $Utils.Optional<ProjectCountAggregateOutputType> | number
          }
        }
      }
      ProjectMember: {
        payload: Prisma.$ProjectMemberPayload<ExtArgs>
        fields: Prisma.ProjectMemberFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProjectMemberFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProjectMemberFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          findFirst: {
            args: Prisma.ProjectMemberFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProjectMemberFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          findMany: {
            args: Prisma.ProjectMemberFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>[]
          }
          create: {
            args: Prisma.ProjectMemberCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          createMany: {
            args: Prisma.ProjectMemberCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProjectMemberCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>[]
          }
          delete: {
            args: Prisma.ProjectMemberDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          update: {
            args: Prisma.ProjectMemberUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          deleteMany: {
            args: Prisma.ProjectMemberDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProjectMemberUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProjectMemberUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>[]
          }
          upsert: {
            args: Prisma.ProjectMemberUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProjectMemberPayload>
          }
          aggregate: {
            args: Prisma.ProjectMemberAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProjectMember>
          }
          groupBy: {
            args: Prisma.ProjectMemberGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProjectMemberGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProjectMemberCountArgs<ExtArgs>
            result: $Utils.Optional<ProjectMemberCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    oauthState?: OauthStateOmit
    projectFile?: ProjectFileOmit
    translation?: TranslationOmit
    translationHistory?: TranslationHistoryOmit
    project?: ProjectOmit
    projectMember?: ProjectMemberOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    projects: number
    translations: number
    translationHistory: number
    projectMemberships: number
    addedMembers: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    projects?: boolean | UserCountOutputTypeCountProjectsArgs
    translations?: boolean | UserCountOutputTypeCountTranslationsArgs
    translationHistory?: boolean | UserCountOutputTypeCountTranslationHistoryArgs
    projectMemberships?: boolean | UserCountOutputTypeCountProjectMembershipsArgs
    addedMembers?: boolean | UserCountOutputTypeCountAddedMembersArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountProjectsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTranslationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TranslationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTranslationHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TranslationHistoryWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountProjectMembershipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAddedMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
  }


  /**
   * Count Type TranslationCountOutputType
   */

  export type TranslationCountOutputType = {
    history: number
  }

  export type TranslationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    history?: boolean | TranslationCountOutputTypeCountHistoryArgs
  }

  // Custom InputTypes
  /**
   * TranslationCountOutputType without action
   */
  export type TranslationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationCountOutputType
     */
    select?: TranslationCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TranslationCountOutputType without action
   */
  export type TranslationCountOutputTypeCountHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TranslationHistoryWhereInput
  }


  /**
   * Count Type ProjectCountOutputType
   */

  export type ProjectCountOutputType = {
    members: number
  }

  export type ProjectCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    members?: boolean | ProjectCountOutputTypeCountMembersArgs
  }

  // Custom InputTypes
  /**
   * ProjectCountOutputType without action
   */
  export type ProjectCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectCountOutputType
     */
    select?: ProjectCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ProjectCountOutputType without action
   */
  export type ProjectCountOutputTypeCountMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    githubId: number | null
  }

  export type UserSumAggregateOutputType = {
    githubId: number | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    githubId: number | null
    username: string | null
    email: string | null
    avatarUrl: string | null
    createdAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    githubId: number | null
    username: string | null
    email: string | null
    avatarUrl: string | null
    createdAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    githubId: number
    username: number
    email: number
    avatarUrl: number
    createdAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    githubId?: true
  }

  export type UserSumAggregateInputType = {
    githubId?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    githubId?: true
    username?: true
    email?: true
    avatarUrl?: true
    createdAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    githubId?: true
    username?: true
    email?: true
    avatarUrl?: true
    createdAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    githubId?: true
    username?: true
    email?: true
    avatarUrl?: true
    createdAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl: string | null
    createdAt: Date
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    githubId?: boolean
    username?: boolean
    email?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
    projects?: boolean | User$projectsArgs<ExtArgs>
    translations?: boolean | User$translationsArgs<ExtArgs>
    translationHistory?: boolean | User$translationHistoryArgs<ExtArgs>
    projectMemberships?: boolean | User$projectMembershipsArgs<ExtArgs>
    addedMembers?: boolean | User$addedMembersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    githubId?: boolean
    username?: boolean
    email?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    githubId?: boolean
    username?: boolean
    email?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    githubId?: boolean
    username?: boolean
    email?: boolean
    avatarUrl?: boolean
    createdAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "githubId" | "username" | "email" | "avatarUrl" | "createdAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    projects?: boolean | User$projectsArgs<ExtArgs>
    translations?: boolean | User$translationsArgs<ExtArgs>
    translationHistory?: boolean | User$translationHistoryArgs<ExtArgs>
    projectMemberships?: boolean | User$projectMembershipsArgs<ExtArgs>
    addedMembers?: boolean | User$addedMembersArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      projects: Prisma.$ProjectPayload<ExtArgs>[]
      translations: Prisma.$TranslationPayload<ExtArgs>[]
      translationHistory: Prisma.$TranslationHistoryPayload<ExtArgs>[]
      projectMemberships: Prisma.$ProjectMemberPayload<ExtArgs>[]
      addedMembers: Prisma.$ProjectMemberPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      githubId: number
      username: string
      email: string
      avatarUrl: string | null
      createdAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    projects<T extends User$projectsArgs<ExtArgs> = {}>(args?: Subset<T, User$projectsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    translations<T extends User$translationsArgs<ExtArgs> = {}>(args?: Subset<T, User$translationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    translationHistory<T extends User$translationHistoryArgs<ExtArgs> = {}>(args?: Subset<T, User$translationHistoryArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    projectMemberships<T extends User$projectMembershipsArgs<ExtArgs> = {}>(args?: Subset<T, User$projectMembershipsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    addedMembers<T extends User$addedMembersArgs<ExtArgs> = {}>(args?: Subset<T, User$addedMembersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly githubId: FieldRef<"User", 'Int'>
    readonly username: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly avatarUrl: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.projects
   */
  export type User$projectsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    where?: ProjectWhereInput
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    cursor?: ProjectWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * User.translations
   */
  export type User$translationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    where?: TranslationWhereInput
    orderBy?: TranslationOrderByWithRelationInput | TranslationOrderByWithRelationInput[]
    cursor?: TranslationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TranslationScalarFieldEnum | TranslationScalarFieldEnum[]
  }

  /**
   * User.translationHistory
   */
  export type User$translationHistoryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    where?: TranslationHistoryWhereInput
    orderBy?: TranslationHistoryOrderByWithRelationInput | TranslationHistoryOrderByWithRelationInput[]
    cursor?: TranslationHistoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TranslationHistoryScalarFieldEnum | TranslationHistoryScalarFieldEnum[]
  }

  /**
   * User.projectMemberships
   */
  export type User$projectMembershipsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    cursor?: ProjectMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * User.addedMembers
   */
  export type User$addedMembersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    cursor?: ProjectMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model OauthState
   */

  export type AggregateOauthState = {
    _count: OauthStateCountAggregateOutputType | null
    _avg: OauthStateAvgAggregateOutputType | null
    _sum: OauthStateSumAggregateOutputType | null
    _min: OauthStateMinAggregateOutputType | null
    _max: OauthStateMaxAggregateOutputType | null
  }

  export type OauthStateAvgAggregateOutputType = {
    timestamp: number | null
  }

  export type OauthStateSumAggregateOutputType = {
    timestamp: number | null
  }

  export type OauthStateMinAggregateOutputType = {
    state: string | null
    timestamp: number | null
    expiresAt: Date | null
  }

  export type OauthStateMaxAggregateOutputType = {
    state: string | null
    timestamp: number | null
    expiresAt: Date | null
  }

  export type OauthStateCountAggregateOutputType = {
    state: number
    timestamp: number
    expiresAt: number
    _all: number
  }


  export type OauthStateAvgAggregateInputType = {
    timestamp?: true
  }

  export type OauthStateSumAggregateInputType = {
    timestamp?: true
  }

  export type OauthStateMinAggregateInputType = {
    state?: true
    timestamp?: true
    expiresAt?: true
  }

  export type OauthStateMaxAggregateInputType = {
    state?: true
    timestamp?: true
    expiresAt?: true
  }

  export type OauthStateCountAggregateInputType = {
    state?: true
    timestamp?: true
    expiresAt?: true
    _all?: true
  }

  export type OauthStateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OauthState to aggregate.
     */
    where?: OauthStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OauthStates to fetch.
     */
    orderBy?: OauthStateOrderByWithRelationInput | OauthStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OauthStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OauthStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OauthStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OauthStates
    **/
    _count?: true | OauthStateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OauthStateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OauthStateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OauthStateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OauthStateMaxAggregateInputType
  }

  export type GetOauthStateAggregateType<T extends OauthStateAggregateArgs> = {
        [P in keyof T & keyof AggregateOauthState]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOauthState[P]>
      : GetScalarType<T[P], AggregateOauthState[P]>
  }




  export type OauthStateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OauthStateWhereInput
    orderBy?: OauthStateOrderByWithAggregationInput | OauthStateOrderByWithAggregationInput[]
    by: OauthStateScalarFieldEnum[] | OauthStateScalarFieldEnum
    having?: OauthStateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OauthStateCountAggregateInputType | true
    _avg?: OauthStateAvgAggregateInputType
    _sum?: OauthStateSumAggregateInputType
    _min?: OauthStateMinAggregateInputType
    _max?: OauthStateMaxAggregateInputType
  }

  export type OauthStateGroupByOutputType = {
    state: string
    timestamp: number
    expiresAt: Date
    _count: OauthStateCountAggregateOutputType | null
    _avg: OauthStateAvgAggregateOutputType | null
    _sum: OauthStateSumAggregateOutputType | null
    _min: OauthStateMinAggregateOutputType | null
    _max: OauthStateMaxAggregateOutputType | null
  }

  type GetOauthStateGroupByPayload<T extends OauthStateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OauthStateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OauthStateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OauthStateGroupByOutputType[P]>
            : GetScalarType<T[P], OauthStateGroupByOutputType[P]>
        }
      >
    >


  export type OauthStateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    state?: boolean
    timestamp?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["oauthState"]>

  export type OauthStateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    state?: boolean
    timestamp?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["oauthState"]>

  export type OauthStateSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    state?: boolean
    timestamp?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["oauthState"]>

  export type OauthStateSelectScalar = {
    state?: boolean
    timestamp?: boolean
    expiresAt?: boolean
  }

  export type OauthStateOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"state" | "timestamp" | "expiresAt", ExtArgs["result"]["oauthState"]>

  export type $OauthStatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OauthState"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      state: string
      timestamp: number
      expiresAt: Date
    }, ExtArgs["result"]["oauthState"]>
    composites: {}
  }

  type OauthStateGetPayload<S extends boolean | null | undefined | OauthStateDefaultArgs> = $Result.GetResult<Prisma.$OauthStatePayload, S>

  type OauthStateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<OauthStateFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: OauthStateCountAggregateInputType | true
    }

  export interface OauthStateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OauthState'], meta: { name: 'OauthState' } }
    /**
     * Find zero or one OauthState that matches the filter.
     * @param {OauthStateFindUniqueArgs} args - Arguments to find a OauthState
     * @example
     * // Get one OauthState
     * const oauthState = await prisma.oauthState.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OauthStateFindUniqueArgs>(args: SelectSubset<T, OauthStateFindUniqueArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one OauthState that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {OauthStateFindUniqueOrThrowArgs} args - Arguments to find a OauthState
     * @example
     * // Get one OauthState
     * const oauthState = await prisma.oauthState.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OauthStateFindUniqueOrThrowArgs>(args: SelectSubset<T, OauthStateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OauthState that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateFindFirstArgs} args - Arguments to find a OauthState
     * @example
     * // Get one OauthState
     * const oauthState = await prisma.oauthState.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OauthStateFindFirstArgs>(args?: SelectSubset<T, OauthStateFindFirstArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first OauthState that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateFindFirstOrThrowArgs} args - Arguments to find a OauthState
     * @example
     * // Get one OauthState
     * const oauthState = await prisma.oauthState.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OauthStateFindFirstOrThrowArgs>(args?: SelectSubset<T, OauthStateFindFirstOrThrowArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more OauthStates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OauthStates
     * const oauthStates = await prisma.oauthState.findMany()
     * 
     * // Get first 10 OauthStates
     * const oauthStates = await prisma.oauthState.findMany({ take: 10 })
     * 
     * // Only select the `state`
     * const oauthStateWithStateOnly = await prisma.oauthState.findMany({ select: { state: true } })
     * 
     */
    findMany<T extends OauthStateFindManyArgs>(args?: SelectSubset<T, OauthStateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a OauthState.
     * @param {OauthStateCreateArgs} args - Arguments to create a OauthState.
     * @example
     * // Create one OauthState
     * const OauthState = await prisma.oauthState.create({
     *   data: {
     *     // ... data to create a OauthState
     *   }
     * })
     * 
     */
    create<T extends OauthStateCreateArgs>(args: SelectSubset<T, OauthStateCreateArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many OauthStates.
     * @param {OauthStateCreateManyArgs} args - Arguments to create many OauthStates.
     * @example
     * // Create many OauthStates
     * const oauthState = await prisma.oauthState.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OauthStateCreateManyArgs>(args?: SelectSubset<T, OauthStateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OauthStates and returns the data saved in the database.
     * @param {OauthStateCreateManyAndReturnArgs} args - Arguments to create many OauthStates.
     * @example
     * // Create many OauthStates
     * const oauthState = await prisma.oauthState.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OauthStates and only return the `state`
     * const oauthStateWithStateOnly = await prisma.oauthState.createManyAndReturn({
     *   select: { state: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OauthStateCreateManyAndReturnArgs>(args?: SelectSubset<T, OauthStateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a OauthState.
     * @param {OauthStateDeleteArgs} args - Arguments to delete one OauthState.
     * @example
     * // Delete one OauthState
     * const OauthState = await prisma.oauthState.delete({
     *   where: {
     *     // ... filter to delete one OauthState
     *   }
     * })
     * 
     */
    delete<T extends OauthStateDeleteArgs>(args: SelectSubset<T, OauthStateDeleteArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one OauthState.
     * @param {OauthStateUpdateArgs} args - Arguments to update one OauthState.
     * @example
     * // Update one OauthState
     * const oauthState = await prisma.oauthState.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OauthStateUpdateArgs>(args: SelectSubset<T, OauthStateUpdateArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more OauthStates.
     * @param {OauthStateDeleteManyArgs} args - Arguments to filter OauthStates to delete.
     * @example
     * // Delete a few OauthStates
     * const { count } = await prisma.oauthState.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OauthStateDeleteManyArgs>(args?: SelectSubset<T, OauthStateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OauthStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OauthStates
     * const oauthState = await prisma.oauthState.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OauthStateUpdateManyArgs>(args: SelectSubset<T, OauthStateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OauthStates and returns the data updated in the database.
     * @param {OauthStateUpdateManyAndReturnArgs} args - Arguments to update many OauthStates.
     * @example
     * // Update many OauthStates
     * const oauthState = await prisma.oauthState.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more OauthStates and only return the `state`
     * const oauthStateWithStateOnly = await prisma.oauthState.updateManyAndReturn({
     *   select: { state: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends OauthStateUpdateManyAndReturnArgs>(args: SelectSubset<T, OauthStateUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one OauthState.
     * @param {OauthStateUpsertArgs} args - Arguments to update or create a OauthState.
     * @example
     * // Update or create a OauthState
     * const oauthState = await prisma.oauthState.upsert({
     *   create: {
     *     // ... data to create a OauthState
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OauthState we want to update
     *   }
     * })
     */
    upsert<T extends OauthStateUpsertArgs>(args: SelectSubset<T, OauthStateUpsertArgs<ExtArgs>>): Prisma__OauthStateClient<$Result.GetResult<Prisma.$OauthStatePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of OauthStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateCountArgs} args - Arguments to filter OauthStates to count.
     * @example
     * // Count the number of OauthStates
     * const count = await prisma.oauthState.count({
     *   where: {
     *     // ... the filter for the OauthStates we want to count
     *   }
     * })
    **/
    count<T extends OauthStateCountArgs>(
      args?: Subset<T, OauthStateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OauthStateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OauthState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OauthStateAggregateArgs>(args: Subset<T, OauthStateAggregateArgs>): Prisma.PrismaPromise<GetOauthStateAggregateType<T>>

    /**
     * Group by OauthState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OauthStateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OauthStateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OauthStateGroupByArgs['orderBy'] }
        : { orderBy?: OauthStateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OauthStateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOauthStateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OauthState model
   */
  readonly fields: OauthStateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OauthState.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OauthStateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OauthState model
   */
  interface OauthStateFieldRefs {
    readonly state: FieldRef<"OauthState", 'String'>
    readonly timestamp: FieldRef<"OauthState", 'Int'>
    readonly expiresAt: FieldRef<"OauthState", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OauthState findUnique
   */
  export type OauthStateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * Filter, which OauthState to fetch.
     */
    where: OauthStateWhereUniqueInput
  }

  /**
   * OauthState findUniqueOrThrow
   */
  export type OauthStateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * Filter, which OauthState to fetch.
     */
    where: OauthStateWhereUniqueInput
  }

  /**
   * OauthState findFirst
   */
  export type OauthStateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * Filter, which OauthState to fetch.
     */
    where?: OauthStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OauthStates to fetch.
     */
    orderBy?: OauthStateOrderByWithRelationInput | OauthStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OauthStates.
     */
    cursor?: OauthStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OauthStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OauthStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OauthStates.
     */
    distinct?: OauthStateScalarFieldEnum | OauthStateScalarFieldEnum[]
  }

  /**
   * OauthState findFirstOrThrow
   */
  export type OauthStateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * Filter, which OauthState to fetch.
     */
    where?: OauthStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OauthStates to fetch.
     */
    orderBy?: OauthStateOrderByWithRelationInput | OauthStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OauthStates.
     */
    cursor?: OauthStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OauthStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OauthStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OauthStates.
     */
    distinct?: OauthStateScalarFieldEnum | OauthStateScalarFieldEnum[]
  }

  /**
   * OauthState findMany
   */
  export type OauthStateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * Filter, which OauthStates to fetch.
     */
    where?: OauthStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OauthStates to fetch.
     */
    orderBy?: OauthStateOrderByWithRelationInput | OauthStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OauthStates.
     */
    cursor?: OauthStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OauthStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OauthStates.
     */
    skip?: number
    distinct?: OauthStateScalarFieldEnum | OauthStateScalarFieldEnum[]
  }

  /**
   * OauthState create
   */
  export type OauthStateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * The data needed to create a OauthState.
     */
    data: XOR<OauthStateCreateInput, OauthStateUncheckedCreateInput>
  }

  /**
   * OauthState createMany
   */
  export type OauthStateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OauthStates.
     */
    data: OauthStateCreateManyInput | OauthStateCreateManyInput[]
  }

  /**
   * OauthState createManyAndReturn
   */
  export type OauthStateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * The data used to create many OauthStates.
     */
    data: OauthStateCreateManyInput | OauthStateCreateManyInput[]
  }

  /**
   * OauthState update
   */
  export type OauthStateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * The data needed to update a OauthState.
     */
    data: XOR<OauthStateUpdateInput, OauthStateUncheckedUpdateInput>
    /**
     * Choose, which OauthState to update.
     */
    where: OauthStateWhereUniqueInput
  }

  /**
   * OauthState updateMany
   */
  export type OauthStateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OauthStates.
     */
    data: XOR<OauthStateUpdateManyMutationInput, OauthStateUncheckedUpdateManyInput>
    /**
     * Filter which OauthStates to update
     */
    where?: OauthStateWhereInput
    /**
     * Limit how many OauthStates to update.
     */
    limit?: number
  }

  /**
   * OauthState updateManyAndReturn
   */
  export type OauthStateUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * The data used to update OauthStates.
     */
    data: XOR<OauthStateUpdateManyMutationInput, OauthStateUncheckedUpdateManyInput>
    /**
     * Filter which OauthStates to update
     */
    where?: OauthStateWhereInput
    /**
     * Limit how many OauthStates to update.
     */
    limit?: number
  }

  /**
   * OauthState upsert
   */
  export type OauthStateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * The filter to search for the OauthState to update in case it exists.
     */
    where: OauthStateWhereUniqueInput
    /**
     * In case the OauthState found by the `where` argument doesn't exist, create a new OauthState with this data.
     */
    create: XOR<OauthStateCreateInput, OauthStateUncheckedCreateInput>
    /**
     * In case the OauthState was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OauthStateUpdateInput, OauthStateUncheckedUpdateInput>
  }

  /**
   * OauthState delete
   */
  export type OauthStateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
    /**
     * Filter which OauthState to delete.
     */
    where: OauthStateWhereUniqueInput
  }

  /**
   * OauthState deleteMany
   */
  export type OauthStateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OauthStates to delete
     */
    where?: OauthStateWhereInput
    /**
     * Limit how many OauthStates to delete.
     */
    limit?: number
  }

  /**
   * OauthState without action
   */
  export type OauthStateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OauthState
     */
    select?: OauthStateSelect<ExtArgs> | null
    /**
     * Omit specific fields from the OauthState
     */
    omit?: OauthStateOmit<ExtArgs> | null
  }


  /**
   * Model ProjectFile
   */

  export type AggregateProjectFile = {
    _count: ProjectFileCountAggregateOutputType | null
    _min: ProjectFileMinAggregateOutputType | null
    _max: ProjectFileMaxAggregateOutputType | null
  }

  export type ProjectFileMinAggregateOutputType = {
    id: string | null
    projectId: string | null
    branch: string | null
    commitSha: string | null
    filename: string | null
    filetype: string | null
    lang: string | null
    contents: string | null
    metadata: string | null
    uploadedAt: Date | null
  }

  export type ProjectFileMaxAggregateOutputType = {
    id: string | null
    projectId: string | null
    branch: string | null
    commitSha: string | null
    filename: string | null
    filetype: string | null
    lang: string | null
    contents: string | null
    metadata: string | null
    uploadedAt: Date | null
  }

  export type ProjectFileCountAggregateOutputType = {
    id: number
    projectId: number
    branch: number
    commitSha: number
    filename: number
    filetype: number
    lang: number
    contents: number
    metadata: number
    uploadedAt: number
    _all: number
  }


  export type ProjectFileMinAggregateInputType = {
    id?: true
    projectId?: true
    branch?: true
    commitSha?: true
    filename?: true
    filetype?: true
    lang?: true
    contents?: true
    metadata?: true
    uploadedAt?: true
  }

  export type ProjectFileMaxAggregateInputType = {
    id?: true
    projectId?: true
    branch?: true
    commitSha?: true
    filename?: true
    filetype?: true
    lang?: true
    contents?: true
    metadata?: true
    uploadedAt?: true
  }

  export type ProjectFileCountAggregateInputType = {
    id?: true
    projectId?: true
    branch?: true
    commitSha?: true
    filename?: true
    filetype?: true
    lang?: true
    contents?: true
    metadata?: true
    uploadedAt?: true
    _all?: true
  }

  export type ProjectFileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProjectFile to aggregate.
     */
    where?: ProjectFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectFiles to fetch.
     */
    orderBy?: ProjectFileOrderByWithRelationInput | ProjectFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProjectFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProjectFiles
    **/
    _count?: true | ProjectFileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProjectFileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProjectFileMaxAggregateInputType
  }

  export type GetProjectFileAggregateType<T extends ProjectFileAggregateArgs> = {
        [P in keyof T & keyof AggregateProjectFile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProjectFile[P]>
      : GetScalarType<T[P], AggregateProjectFile[P]>
  }




  export type ProjectFileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectFileWhereInput
    orderBy?: ProjectFileOrderByWithAggregationInput | ProjectFileOrderByWithAggregationInput[]
    by: ProjectFileScalarFieldEnum[] | ProjectFileScalarFieldEnum
    having?: ProjectFileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProjectFileCountAggregateInputType | true
    _min?: ProjectFileMinAggregateInputType
    _max?: ProjectFileMaxAggregateInputType
  }

  export type ProjectFileGroupByOutputType = {
    id: string
    projectId: string
    branch: string
    commitSha: string
    filename: string
    filetype: string
    lang: string
    contents: string
    metadata: string | null
    uploadedAt: Date
    _count: ProjectFileCountAggregateOutputType | null
    _min: ProjectFileMinAggregateOutputType | null
    _max: ProjectFileMaxAggregateOutputType | null
  }

  type GetProjectFileGroupByPayload<T extends ProjectFileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProjectFileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProjectFileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProjectFileGroupByOutputType[P]>
            : GetScalarType<T[P], ProjectFileGroupByOutputType[P]>
        }
      >
    >


  export type ProjectFileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    branch?: boolean
    commitSha?: boolean
    filename?: boolean
    filetype?: boolean
    lang?: boolean
    contents?: boolean
    metadata?: boolean
    uploadedAt?: boolean
  }, ExtArgs["result"]["projectFile"]>

  export type ProjectFileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    branch?: boolean
    commitSha?: boolean
    filename?: boolean
    filetype?: boolean
    lang?: boolean
    contents?: boolean
    metadata?: boolean
    uploadedAt?: boolean
  }, ExtArgs["result"]["projectFile"]>

  export type ProjectFileSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    branch?: boolean
    commitSha?: boolean
    filename?: boolean
    filetype?: boolean
    lang?: boolean
    contents?: boolean
    metadata?: boolean
    uploadedAt?: boolean
  }, ExtArgs["result"]["projectFile"]>

  export type ProjectFileSelectScalar = {
    id?: boolean
    projectId?: boolean
    branch?: boolean
    commitSha?: boolean
    filename?: boolean
    filetype?: boolean
    lang?: boolean
    contents?: boolean
    metadata?: boolean
    uploadedAt?: boolean
  }

  export type ProjectFileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "projectId" | "branch" | "commitSha" | "filename" | "filetype" | "lang" | "contents" | "metadata" | "uploadedAt", ExtArgs["result"]["projectFile"]>

  export type $ProjectFilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProjectFile"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      projectId: string
      branch: string
      commitSha: string
      filename: string
      filetype: string
      lang: string
      contents: string
      metadata: string | null
      uploadedAt: Date
    }, ExtArgs["result"]["projectFile"]>
    composites: {}
  }

  type ProjectFileGetPayload<S extends boolean | null | undefined | ProjectFileDefaultArgs> = $Result.GetResult<Prisma.$ProjectFilePayload, S>

  type ProjectFileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProjectFileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProjectFileCountAggregateInputType | true
    }

  export interface ProjectFileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProjectFile'], meta: { name: 'ProjectFile' } }
    /**
     * Find zero or one ProjectFile that matches the filter.
     * @param {ProjectFileFindUniqueArgs} args - Arguments to find a ProjectFile
     * @example
     * // Get one ProjectFile
     * const projectFile = await prisma.projectFile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProjectFileFindUniqueArgs>(args: SelectSubset<T, ProjectFileFindUniqueArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProjectFile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProjectFileFindUniqueOrThrowArgs} args - Arguments to find a ProjectFile
     * @example
     * // Get one ProjectFile
     * const projectFile = await prisma.projectFile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProjectFileFindUniqueOrThrowArgs>(args: SelectSubset<T, ProjectFileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProjectFile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileFindFirstArgs} args - Arguments to find a ProjectFile
     * @example
     * // Get one ProjectFile
     * const projectFile = await prisma.projectFile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProjectFileFindFirstArgs>(args?: SelectSubset<T, ProjectFileFindFirstArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProjectFile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileFindFirstOrThrowArgs} args - Arguments to find a ProjectFile
     * @example
     * // Get one ProjectFile
     * const projectFile = await prisma.projectFile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProjectFileFindFirstOrThrowArgs>(args?: SelectSubset<T, ProjectFileFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProjectFiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProjectFiles
     * const projectFiles = await prisma.projectFile.findMany()
     * 
     * // Get first 10 ProjectFiles
     * const projectFiles = await prisma.projectFile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const projectFileWithIdOnly = await prisma.projectFile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProjectFileFindManyArgs>(args?: SelectSubset<T, ProjectFileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProjectFile.
     * @param {ProjectFileCreateArgs} args - Arguments to create a ProjectFile.
     * @example
     * // Create one ProjectFile
     * const ProjectFile = await prisma.projectFile.create({
     *   data: {
     *     // ... data to create a ProjectFile
     *   }
     * })
     * 
     */
    create<T extends ProjectFileCreateArgs>(args: SelectSubset<T, ProjectFileCreateArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProjectFiles.
     * @param {ProjectFileCreateManyArgs} args - Arguments to create many ProjectFiles.
     * @example
     * // Create many ProjectFiles
     * const projectFile = await prisma.projectFile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProjectFileCreateManyArgs>(args?: SelectSubset<T, ProjectFileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProjectFiles and returns the data saved in the database.
     * @param {ProjectFileCreateManyAndReturnArgs} args - Arguments to create many ProjectFiles.
     * @example
     * // Create many ProjectFiles
     * const projectFile = await prisma.projectFile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProjectFiles and only return the `id`
     * const projectFileWithIdOnly = await prisma.projectFile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProjectFileCreateManyAndReturnArgs>(args?: SelectSubset<T, ProjectFileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProjectFile.
     * @param {ProjectFileDeleteArgs} args - Arguments to delete one ProjectFile.
     * @example
     * // Delete one ProjectFile
     * const ProjectFile = await prisma.projectFile.delete({
     *   where: {
     *     // ... filter to delete one ProjectFile
     *   }
     * })
     * 
     */
    delete<T extends ProjectFileDeleteArgs>(args: SelectSubset<T, ProjectFileDeleteArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProjectFile.
     * @param {ProjectFileUpdateArgs} args - Arguments to update one ProjectFile.
     * @example
     * // Update one ProjectFile
     * const projectFile = await prisma.projectFile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProjectFileUpdateArgs>(args: SelectSubset<T, ProjectFileUpdateArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProjectFiles.
     * @param {ProjectFileDeleteManyArgs} args - Arguments to filter ProjectFiles to delete.
     * @example
     * // Delete a few ProjectFiles
     * const { count } = await prisma.projectFile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProjectFileDeleteManyArgs>(args?: SelectSubset<T, ProjectFileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProjectFiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProjectFiles
     * const projectFile = await prisma.projectFile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProjectFileUpdateManyArgs>(args: SelectSubset<T, ProjectFileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProjectFiles and returns the data updated in the database.
     * @param {ProjectFileUpdateManyAndReturnArgs} args - Arguments to update many ProjectFiles.
     * @example
     * // Update many ProjectFiles
     * const projectFile = await prisma.projectFile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProjectFiles and only return the `id`
     * const projectFileWithIdOnly = await prisma.projectFile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProjectFileUpdateManyAndReturnArgs>(args: SelectSubset<T, ProjectFileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProjectFile.
     * @param {ProjectFileUpsertArgs} args - Arguments to update or create a ProjectFile.
     * @example
     * // Update or create a ProjectFile
     * const projectFile = await prisma.projectFile.upsert({
     *   create: {
     *     // ... data to create a ProjectFile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProjectFile we want to update
     *   }
     * })
     */
    upsert<T extends ProjectFileUpsertArgs>(args: SelectSubset<T, ProjectFileUpsertArgs<ExtArgs>>): Prisma__ProjectFileClient<$Result.GetResult<Prisma.$ProjectFilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProjectFiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileCountArgs} args - Arguments to filter ProjectFiles to count.
     * @example
     * // Count the number of ProjectFiles
     * const count = await prisma.projectFile.count({
     *   where: {
     *     // ... the filter for the ProjectFiles we want to count
     *   }
     * })
    **/
    count<T extends ProjectFileCountArgs>(
      args?: Subset<T, ProjectFileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProjectFileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProjectFile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProjectFileAggregateArgs>(args: Subset<T, ProjectFileAggregateArgs>): Prisma.PrismaPromise<GetProjectFileAggregateType<T>>

    /**
     * Group by ProjectFile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProjectFileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProjectFileGroupByArgs['orderBy'] }
        : { orderBy?: ProjectFileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProjectFileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProjectFileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProjectFile model
   */
  readonly fields: ProjectFileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProjectFile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProjectFileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProjectFile model
   */
  interface ProjectFileFieldRefs {
    readonly id: FieldRef<"ProjectFile", 'String'>
    readonly projectId: FieldRef<"ProjectFile", 'String'>
    readonly branch: FieldRef<"ProjectFile", 'String'>
    readonly commitSha: FieldRef<"ProjectFile", 'String'>
    readonly filename: FieldRef<"ProjectFile", 'String'>
    readonly filetype: FieldRef<"ProjectFile", 'String'>
    readonly lang: FieldRef<"ProjectFile", 'String'>
    readonly contents: FieldRef<"ProjectFile", 'String'>
    readonly metadata: FieldRef<"ProjectFile", 'String'>
    readonly uploadedAt: FieldRef<"ProjectFile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProjectFile findUnique
   */
  export type ProjectFileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * Filter, which ProjectFile to fetch.
     */
    where: ProjectFileWhereUniqueInput
  }

  /**
   * ProjectFile findUniqueOrThrow
   */
  export type ProjectFileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * Filter, which ProjectFile to fetch.
     */
    where: ProjectFileWhereUniqueInput
  }

  /**
   * ProjectFile findFirst
   */
  export type ProjectFileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * Filter, which ProjectFile to fetch.
     */
    where?: ProjectFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectFiles to fetch.
     */
    orderBy?: ProjectFileOrderByWithRelationInput | ProjectFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProjectFiles.
     */
    cursor?: ProjectFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProjectFiles.
     */
    distinct?: ProjectFileScalarFieldEnum | ProjectFileScalarFieldEnum[]
  }

  /**
   * ProjectFile findFirstOrThrow
   */
  export type ProjectFileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * Filter, which ProjectFile to fetch.
     */
    where?: ProjectFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectFiles to fetch.
     */
    orderBy?: ProjectFileOrderByWithRelationInput | ProjectFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProjectFiles.
     */
    cursor?: ProjectFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProjectFiles.
     */
    distinct?: ProjectFileScalarFieldEnum | ProjectFileScalarFieldEnum[]
  }

  /**
   * ProjectFile findMany
   */
  export type ProjectFileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * Filter, which ProjectFiles to fetch.
     */
    where?: ProjectFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectFiles to fetch.
     */
    orderBy?: ProjectFileOrderByWithRelationInput | ProjectFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProjectFiles.
     */
    cursor?: ProjectFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectFiles.
     */
    skip?: number
    distinct?: ProjectFileScalarFieldEnum | ProjectFileScalarFieldEnum[]
  }

  /**
   * ProjectFile create
   */
  export type ProjectFileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * The data needed to create a ProjectFile.
     */
    data: XOR<ProjectFileCreateInput, ProjectFileUncheckedCreateInput>
  }

  /**
   * ProjectFile createMany
   */
  export type ProjectFileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProjectFiles.
     */
    data: ProjectFileCreateManyInput | ProjectFileCreateManyInput[]
  }

  /**
   * ProjectFile createManyAndReturn
   */
  export type ProjectFileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * The data used to create many ProjectFiles.
     */
    data: ProjectFileCreateManyInput | ProjectFileCreateManyInput[]
  }

  /**
   * ProjectFile update
   */
  export type ProjectFileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * The data needed to update a ProjectFile.
     */
    data: XOR<ProjectFileUpdateInput, ProjectFileUncheckedUpdateInput>
    /**
     * Choose, which ProjectFile to update.
     */
    where: ProjectFileWhereUniqueInput
  }

  /**
   * ProjectFile updateMany
   */
  export type ProjectFileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProjectFiles.
     */
    data: XOR<ProjectFileUpdateManyMutationInput, ProjectFileUncheckedUpdateManyInput>
    /**
     * Filter which ProjectFiles to update
     */
    where?: ProjectFileWhereInput
    /**
     * Limit how many ProjectFiles to update.
     */
    limit?: number
  }

  /**
   * ProjectFile updateManyAndReturn
   */
  export type ProjectFileUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * The data used to update ProjectFiles.
     */
    data: XOR<ProjectFileUpdateManyMutationInput, ProjectFileUncheckedUpdateManyInput>
    /**
     * Filter which ProjectFiles to update
     */
    where?: ProjectFileWhereInput
    /**
     * Limit how many ProjectFiles to update.
     */
    limit?: number
  }

  /**
   * ProjectFile upsert
   */
  export type ProjectFileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * The filter to search for the ProjectFile to update in case it exists.
     */
    where: ProjectFileWhereUniqueInput
    /**
     * In case the ProjectFile found by the `where` argument doesn't exist, create a new ProjectFile with this data.
     */
    create: XOR<ProjectFileCreateInput, ProjectFileUncheckedCreateInput>
    /**
     * In case the ProjectFile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProjectFileUpdateInput, ProjectFileUncheckedUpdateInput>
  }

  /**
   * ProjectFile delete
   */
  export type ProjectFileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
    /**
     * Filter which ProjectFile to delete.
     */
    where: ProjectFileWhereUniqueInput
  }

  /**
   * ProjectFile deleteMany
   */
  export type ProjectFileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProjectFiles to delete
     */
    where?: ProjectFileWhereInput
    /**
     * Limit how many ProjectFiles to delete.
     */
    limit?: number
  }

  /**
   * ProjectFile without action
   */
  export type ProjectFileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectFile
     */
    select?: ProjectFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectFile
     */
    omit?: ProjectFileOmit<ExtArgs> | null
  }


  /**
   * Model Translation
   */

  export type AggregateTranslation = {
    _count: TranslationCountAggregateOutputType | null
    _min: TranslationMinAggregateOutputType | null
    _max: TranslationMaxAggregateOutputType | null
  }

  export type TranslationMinAggregateOutputType = {
    id: string | null
    projectId: string | null
    language: string | null
    key: string | null
    value: string | null
    userId: string | null
    status: string | null
    commitSha: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TranslationMaxAggregateOutputType = {
    id: string | null
    projectId: string | null
    language: string | null
    key: string | null
    value: string | null
    userId: string | null
    status: string | null
    commitSha: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TranslationCountAggregateOutputType = {
    id: number
    projectId: number
    language: number
    key: number
    value: number
    userId: number
    status: number
    commitSha: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TranslationMinAggregateInputType = {
    id?: true
    projectId?: true
    language?: true
    key?: true
    value?: true
    userId?: true
    status?: true
    commitSha?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TranslationMaxAggregateInputType = {
    id?: true
    projectId?: true
    language?: true
    key?: true
    value?: true
    userId?: true
    status?: true
    commitSha?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TranslationCountAggregateInputType = {
    id?: true
    projectId?: true
    language?: true
    key?: true
    value?: true
    userId?: true
    status?: true
    commitSha?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TranslationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Translation to aggregate.
     */
    where?: TranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Translations to fetch.
     */
    orderBy?: TranslationOrderByWithRelationInput | TranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Translations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Translations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Translations
    **/
    _count?: true | TranslationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TranslationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TranslationMaxAggregateInputType
  }

  export type GetTranslationAggregateType<T extends TranslationAggregateArgs> = {
        [P in keyof T & keyof AggregateTranslation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTranslation[P]>
      : GetScalarType<T[P], AggregateTranslation[P]>
  }




  export type TranslationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TranslationWhereInput
    orderBy?: TranslationOrderByWithAggregationInput | TranslationOrderByWithAggregationInput[]
    by: TranslationScalarFieldEnum[] | TranslationScalarFieldEnum
    having?: TranslationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TranslationCountAggregateInputType | true
    _min?: TranslationMinAggregateInputType
    _max?: TranslationMaxAggregateInputType
  }

  export type TranslationGroupByOutputType = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    status: string
    commitSha: string | null
    createdAt: Date
    updatedAt: Date
    _count: TranslationCountAggregateOutputType | null
    _min: TranslationMinAggregateOutputType | null
    _max: TranslationMaxAggregateOutputType | null
  }

  type GetTranslationGroupByPayload<T extends TranslationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TranslationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TranslationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TranslationGroupByOutputType[P]>
            : GetScalarType<T[P], TranslationGroupByOutputType[P]>
        }
      >
    >


  export type TranslationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    status?: boolean
    commitSha?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    history?: boolean | Translation$historyArgs<ExtArgs>
    _count?: boolean | TranslationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["translation"]>

  export type TranslationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    status?: boolean
    commitSha?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["translation"]>

  export type TranslationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    status?: boolean
    commitSha?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["translation"]>

  export type TranslationSelectScalar = {
    id?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    status?: boolean
    commitSha?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TranslationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "projectId" | "language" | "key" | "value" | "userId" | "status" | "commitSha" | "createdAt" | "updatedAt", ExtArgs["result"]["translation"]>
  export type TranslationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    history?: boolean | Translation$historyArgs<ExtArgs>
    _count?: boolean | TranslationCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TranslationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type TranslationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $TranslationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Translation"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      history: Prisma.$TranslationHistoryPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      projectId: string
      language: string
      key: string
      value: string
      userId: string
      status: string
      commitSha: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["translation"]>
    composites: {}
  }

  type TranslationGetPayload<S extends boolean | null | undefined | TranslationDefaultArgs> = $Result.GetResult<Prisma.$TranslationPayload, S>

  type TranslationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TranslationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TranslationCountAggregateInputType | true
    }

  export interface TranslationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Translation'], meta: { name: 'Translation' } }
    /**
     * Find zero or one Translation that matches the filter.
     * @param {TranslationFindUniqueArgs} args - Arguments to find a Translation
     * @example
     * // Get one Translation
     * const translation = await prisma.translation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TranslationFindUniqueArgs>(args: SelectSubset<T, TranslationFindUniqueArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Translation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TranslationFindUniqueOrThrowArgs} args - Arguments to find a Translation
     * @example
     * // Get one Translation
     * const translation = await prisma.translation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TranslationFindUniqueOrThrowArgs>(args: SelectSubset<T, TranslationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Translation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationFindFirstArgs} args - Arguments to find a Translation
     * @example
     * // Get one Translation
     * const translation = await prisma.translation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TranslationFindFirstArgs>(args?: SelectSubset<T, TranslationFindFirstArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Translation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationFindFirstOrThrowArgs} args - Arguments to find a Translation
     * @example
     * // Get one Translation
     * const translation = await prisma.translation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TranslationFindFirstOrThrowArgs>(args?: SelectSubset<T, TranslationFindFirstOrThrowArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Translations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Translations
     * const translations = await prisma.translation.findMany()
     * 
     * // Get first 10 Translations
     * const translations = await prisma.translation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const translationWithIdOnly = await prisma.translation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TranslationFindManyArgs>(args?: SelectSubset<T, TranslationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Translation.
     * @param {TranslationCreateArgs} args - Arguments to create a Translation.
     * @example
     * // Create one Translation
     * const Translation = await prisma.translation.create({
     *   data: {
     *     // ... data to create a Translation
     *   }
     * })
     * 
     */
    create<T extends TranslationCreateArgs>(args: SelectSubset<T, TranslationCreateArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Translations.
     * @param {TranslationCreateManyArgs} args - Arguments to create many Translations.
     * @example
     * // Create many Translations
     * const translation = await prisma.translation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TranslationCreateManyArgs>(args?: SelectSubset<T, TranslationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Translations and returns the data saved in the database.
     * @param {TranslationCreateManyAndReturnArgs} args - Arguments to create many Translations.
     * @example
     * // Create many Translations
     * const translation = await prisma.translation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Translations and only return the `id`
     * const translationWithIdOnly = await prisma.translation.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TranslationCreateManyAndReturnArgs>(args?: SelectSubset<T, TranslationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Translation.
     * @param {TranslationDeleteArgs} args - Arguments to delete one Translation.
     * @example
     * // Delete one Translation
     * const Translation = await prisma.translation.delete({
     *   where: {
     *     // ... filter to delete one Translation
     *   }
     * })
     * 
     */
    delete<T extends TranslationDeleteArgs>(args: SelectSubset<T, TranslationDeleteArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Translation.
     * @param {TranslationUpdateArgs} args - Arguments to update one Translation.
     * @example
     * // Update one Translation
     * const translation = await prisma.translation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TranslationUpdateArgs>(args: SelectSubset<T, TranslationUpdateArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Translations.
     * @param {TranslationDeleteManyArgs} args - Arguments to filter Translations to delete.
     * @example
     * // Delete a few Translations
     * const { count } = await prisma.translation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TranslationDeleteManyArgs>(args?: SelectSubset<T, TranslationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Translations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Translations
     * const translation = await prisma.translation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TranslationUpdateManyArgs>(args: SelectSubset<T, TranslationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Translations and returns the data updated in the database.
     * @param {TranslationUpdateManyAndReturnArgs} args - Arguments to update many Translations.
     * @example
     * // Update many Translations
     * const translation = await prisma.translation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Translations and only return the `id`
     * const translationWithIdOnly = await prisma.translation.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TranslationUpdateManyAndReturnArgs>(args: SelectSubset<T, TranslationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Translation.
     * @param {TranslationUpsertArgs} args - Arguments to update or create a Translation.
     * @example
     * // Update or create a Translation
     * const translation = await prisma.translation.upsert({
     *   create: {
     *     // ... data to create a Translation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Translation we want to update
     *   }
     * })
     */
    upsert<T extends TranslationUpsertArgs>(args: SelectSubset<T, TranslationUpsertArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Translations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationCountArgs} args - Arguments to filter Translations to count.
     * @example
     * // Count the number of Translations
     * const count = await prisma.translation.count({
     *   where: {
     *     // ... the filter for the Translations we want to count
     *   }
     * })
    **/
    count<T extends TranslationCountArgs>(
      args?: Subset<T, TranslationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TranslationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Translation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TranslationAggregateArgs>(args: Subset<T, TranslationAggregateArgs>): Prisma.PrismaPromise<GetTranslationAggregateType<T>>

    /**
     * Group by Translation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TranslationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TranslationGroupByArgs['orderBy'] }
        : { orderBy?: TranslationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TranslationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTranslationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Translation model
   */
  readonly fields: TranslationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Translation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TranslationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    history<T extends Translation$historyArgs<ExtArgs> = {}>(args?: Subset<T, Translation$historyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Translation model
   */
  interface TranslationFieldRefs {
    readonly id: FieldRef<"Translation", 'String'>
    readonly projectId: FieldRef<"Translation", 'String'>
    readonly language: FieldRef<"Translation", 'String'>
    readonly key: FieldRef<"Translation", 'String'>
    readonly value: FieldRef<"Translation", 'String'>
    readonly userId: FieldRef<"Translation", 'String'>
    readonly status: FieldRef<"Translation", 'String'>
    readonly commitSha: FieldRef<"Translation", 'String'>
    readonly createdAt: FieldRef<"Translation", 'DateTime'>
    readonly updatedAt: FieldRef<"Translation", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Translation findUnique
   */
  export type TranslationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * Filter, which Translation to fetch.
     */
    where: TranslationWhereUniqueInput
  }

  /**
   * Translation findUniqueOrThrow
   */
  export type TranslationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * Filter, which Translation to fetch.
     */
    where: TranslationWhereUniqueInput
  }

  /**
   * Translation findFirst
   */
  export type TranslationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * Filter, which Translation to fetch.
     */
    where?: TranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Translations to fetch.
     */
    orderBy?: TranslationOrderByWithRelationInput | TranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Translations.
     */
    cursor?: TranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Translations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Translations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Translations.
     */
    distinct?: TranslationScalarFieldEnum | TranslationScalarFieldEnum[]
  }

  /**
   * Translation findFirstOrThrow
   */
  export type TranslationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * Filter, which Translation to fetch.
     */
    where?: TranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Translations to fetch.
     */
    orderBy?: TranslationOrderByWithRelationInput | TranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Translations.
     */
    cursor?: TranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Translations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Translations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Translations.
     */
    distinct?: TranslationScalarFieldEnum | TranslationScalarFieldEnum[]
  }

  /**
   * Translation findMany
   */
  export type TranslationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * Filter, which Translations to fetch.
     */
    where?: TranslationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Translations to fetch.
     */
    orderBy?: TranslationOrderByWithRelationInput | TranslationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Translations.
     */
    cursor?: TranslationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Translations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Translations.
     */
    skip?: number
    distinct?: TranslationScalarFieldEnum | TranslationScalarFieldEnum[]
  }

  /**
   * Translation create
   */
  export type TranslationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * The data needed to create a Translation.
     */
    data: XOR<TranslationCreateInput, TranslationUncheckedCreateInput>
  }

  /**
   * Translation createMany
   */
  export type TranslationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Translations.
     */
    data: TranslationCreateManyInput | TranslationCreateManyInput[]
  }

  /**
   * Translation createManyAndReturn
   */
  export type TranslationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * The data used to create many Translations.
     */
    data: TranslationCreateManyInput | TranslationCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Translation update
   */
  export type TranslationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * The data needed to update a Translation.
     */
    data: XOR<TranslationUpdateInput, TranslationUncheckedUpdateInput>
    /**
     * Choose, which Translation to update.
     */
    where: TranslationWhereUniqueInput
  }

  /**
   * Translation updateMany
   */
  export type TranslationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Translations.
     */
    data: XOR<TranslationUpdateManyMutationInput, TranslationUncheckedUpdateManyInput>
    /**
     * Filter which Translations to update
     */
    where?: TranslationWhereInput
    /**
     * Limit how many Translations to update.
     */
    limit?: number
  }

  /**
   * Translation updateManyAndReturn
   */
  export type TranslationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * The data used to update Translations.
     */
    data: XOR<TranslationUpdateManyMutationInput, TranslationUncheckedUpdateManyInput>
    /**
     * Filter which Translations to update
     */
    where?: TranslationWhereInput
    /**
     * Limit how many Translations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Translation upsert
   */
  export type TranslationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * The filter to search for the Translation to update in case it exists.
     */
    where: TranslationWhereUniqueInput
    /**
     * In case the Translation found by the `where` argument doesn't exist, create a new Translation with this data.
     */
    create: XOR<TranslationCreateInput, TranslationUncheckedCreateInput>
    /**
     * In case the Translation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TranslationUpdateInput, TranslationUncheckedUpdateInput>
  }

  /**
   * Translation delete
   */
  export type TranslationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
    /**
     * Filter which Translation to delete.
     */
    where: TranslationWhereUniqueInput
  }

  /**
   * Translation deleteMany
   */
  export type TranslationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Translations to delete
     */
    where?: TranslationWhereInput
    /**
     * Limit how many Translations to delete.
     */
    limit?: number
  }

  /**
   * Translation.history
   */
  export type Translation$historyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    where?: TranslationHistoryWhereInput
    orderBy?: TranslationHistoryOrderByWithRelationInput | TranslationHistoryOrderByWithRelationInput[]
    cursor?: TranslationHistoryWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TranslationHistoryScalarFieldEnum | TranslationHistoryScalarFieldEnum[]
  }

  /**
   * Translation without action
   */
  export type TranslationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Translation
     */
    select?: TranslationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Translation
     */
    omit?: TranslationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationInclude<ExtArgs> | null
  }


  /**
   * Model TranslationHistory
   */

  export type AggregateTranslationHistory = {
    _count: TranslationHistoryCountAggregateOutputType | null
    _min: TranslationHistoryMinAggregateOutputType | null
    _max: TranslationHistoryMaxAggregateOutputType | null
  }

  export type TranslationHistoryMinAggregateOutputType = {
    id: string | null
    translationId: string | null
    projectId: string | null
    language: string | null
    key: string | null
    value: string | null
    userId: string | null
    action: string | null
    commitSha: string | null
    createdAt: Date | null
  }

  export type TranslationHistoryMaxAggregateOutputType = {
    id: string | null
    translationId: string | null
    projectId: string | null
    language: string | null
    key: string | null
    value: string | null
    userId: string | null
    action: string | null
    commitSha: string | null
    createdAt: Date | null
  }

  export type TranslationHistoryCountAggregateOutputType = {
    id: number
    translationId: number
    projectId: number
    language: number
    key: number
    value: number
    userId: number
    action: number
    commitSha: number
    createdAt: number
    _all: number
  }


  export type TranslationHistoryMinAggregateInputType = {
    id?: true
    translationId?: true
    projectId?: true
    language?: true
    key?: true
    value?: true
    userId?: true
    action?: true
    commitSha?: true
    createdAt?: true
  }

  export type TranslationHistoryMaxAggregateInputType = {
    id?: true
    translationId?: true
    projectId?: true
    language?: true
    key?: true
    value?: true
    userId?: true
    action?: true
    commitSha?: true
    createdAt?: true
  }

  export type TranslationHistoryCountAggregateInputType = {
    id?: true
    translationId?: true
    projectId?: true
    language?: true
    key?: true
    value?: true
    userId?: true
    action?: true
    commitSha?: true
    createdAt?: true
    _all?: true
  }

  export type TranslationHistoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TranslationHistory to aggregate.
     */
    where?: TranslationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TranslationHistories to fetch.
     */
    orderBy?: TranslationHistoryOrderByWithRelationInput | TranslationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TranslationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TranslationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TranslationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TranslationHistories
    **/
    _count?: true | TranslationHistoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TranslationHistoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TranslationHistoryMaxAggregateInputType
  }

  export type GetTranslationHistoryAggregateType<T extends TranslationHistoryAggregateArgs> = {
        [P in keyof T & keyof AggregateTranslationHistory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTranslationHistory[P]>
      : GetScalarType<T[P], AggregateTranslationHistory[P]>
  }




  export type TranslationHistoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TranslationHistoryWhereInput
    orderBy?: TranslationHistoryOrderByWithAggregationInput | TranslationHistoryOrderByWithAggregationInput[]
    by: TranslationHistoryScalarFieldEnum[] | TranslationHistoryScalarFieldEnum
    having?: TranslationHistoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TranslationHistoryCountAggregateInputType | true
    _min?: TranslationHistoryMinAggregateInputType
    _max?: TranslationHistoryMaxAggregateInputType
  }

  export type TranslationHistoryGroupByOutputType = {
    id: string
    translationId: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    action: string
    commitSha: string | null
    createdAt: Date
    _count: TranslationHistoryCountAggregateOutputType | null
    _min: TranslationHistoryMinAggregateOutputType | null
    _max: TranslationHistoryMaxAggregateOutputType | null
  }

  type GetTranslationHistoryGroupByPayload<T extends TranslationHistoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TranslationHistoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TranslationHistoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TranslationHistoryGroupByOutputType[P]>
            : GetScalarType<T[P], TranslationHistoryGroupByOutputType[P]>
        }
      >
    >


  export type TranslationHistorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    translationId?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    action?: boolean
    commitSha?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    translation?: boolean | TranslationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["translationHistory"]>

  export type TranslationHistorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    translationId?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    action?: boolean
    commitSha?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    translation?: boolean | TranslationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["translationHistory"]>

  export type TranslationHistorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    translationId?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    action?: boolean
    commitSha?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    translation?: boolean | TranslationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["translationHistory"]>

  export type TranslationHistorySelectScalar = {
    id?: boolean
    translationId?: boolean
    projectId?: boolean
    language?: boolean
    key?: boolean
    value?: boolean
    userId?: boolean
    action?: boolean
    commitSha?: boolean
    createdAt?: boolean
  }

  export type TranslationHistoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "translationId" | "projectId" | "language" | "key" | "value" | "userId" | "action" | "commitSha" | "createdAt", ExtArgs["result"]["translationHistory"]>
  export type TranslationHistoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    translation?: boolean | TranslationDefaultArgs<ExtArgs>
  }
  export type TranslationHistoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    translation?: boolean | TranslationDefaultArgs<ExtArgs>
  }
  export type TranslationHistoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    translation?: boolean | TranslationDefaultArgs<ExtArgs>
  }

  export type $TranslationHistoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TranslationHistory"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      translation: Prisma.$TranslationPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      translationId: string
      projectId: string
      language: string
      key: string
      value: string
      userId: string
      action: string
      commitSha: string | null
      createdAt: Date
    }, ExtArgs["result"]["translationHistory"]>
    composites: {}
  }

  type TranslationHistoryGetPayload<S extends boolean | null | undefined | TranslationHistoryDefaultArgs> = $Result.GetResult<Prisma.$TranslationHistoryPayload, S>

  type TranslationHistoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TranslationHistoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TranslationHistoryCountAggregateInputType | true
    }

  export interface TranslationHistoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TranslationHistory'], meta: { name: 'TranslationHistory' } }
    /**
     * Find zero or one TranslationHistory that matches the filter.
     * @param {TranslationHistoryFindUniqueArgs} args - Arguments to find a TranslationHistory
     * @example
     * // Get one TranslationHistory
     * const translationHistory = await prisma.translationHistory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TranslationHistoryFindUniqueArgs>(args: SelectSubset<T, TranslationHistoryFindUniqueArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TranslationHistory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TranslationHistoryFindUniqueOrThrowArgs} args - Arguments to find a TranslationHistory
     * @example
     * // Get one TranslationHistory
     * const translationHistory = await prisma.translationHistory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TranslationHistoryFindUniqueOrThrowArgs>(args: SelectSubset<T, TranslationHistoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TranslationHistory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryFindFirstArgs} args - Arguments to find a TranslationHistory
     * @example
     * // Get one TranslationHistory
     * const translationHistory = await prisma.translationHistory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TranslationHistoryFindFirstArgs>(args?: SelectSubset<T, TranslationHistoryFindFirstArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TranslationHistory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryFindFirstOrThrowArgs} args - Arguments to find a TranslationHistory
     * @example
     * // Get one TranslationHistory
     * const translationHistory = await prisma.translationHistory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TranslationHistoryFindFirstOrThrowArgs>(args?: SelectSubset<T, TranslationHistoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TranslationHistories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TranslationHistories
     * const translationHistories = await prisma.translationHistory.findMany()
     * 
     * // Get first 10 TranslationHistories
     * const translationHistories = await prisma.translationHistory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const translationHistoryWithIdOnly = await prisma.translationHistory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TranslationHistoryFindManyArgs>(args?: SelectSubset<T, TranslationHistoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TranslationHistory.
     * @param {TranslationHistoryCreateArgs} args - Arguments to create a TranslationHistory.
     * @example
     * // Create one TranslationHistory
     * const TranslationHistory = await prisma.translationHistory.create({
     *   data: {
     *     // ... data to create a TranslationHistory
     *   }
     * })
     * 
     */
    create<T extends TranslationHistoryCreateArgs>(args: SelectSubset<T, TranslationHistoryCreateArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TranslationHistories.
     * @param {TranslationHistoryCreateManyArgs} args - Arguments to create many TranslationHistories.
     * @example
     * // Create many TranslationHistories
     * const translationHistory = await prisma.translationHistory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TranslationHistoryCreateManyArgs>(args?: SelectSubset<T, TranslationHistoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TranslationHistories and returns the data saved in the database.
     * @param {TranslationHistoryCreateManyAndReturnArgs} args - Arguments to create many TranslationHistories.
     * @example
     * // Create many TranslationHistories
     * const translationHistory = await prisma.translationHistory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TranslationHistories and only return the `id`
     * const translationHistoryWithIdOnly = await prisma.translationHistory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TranslationHistoryCreateManyAndReturnArgs>(args?: SelectSubset<T, TranslationHistoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TranslationHistory.
     * @param {TranslationHistoryDeleteArgs} args - Arguments to delete one TranslationHistory.
     * @example
     * // Delete one TranslationHistory
     * const TranslationHistory = await prisma.translationHistory.delete({
     *   where: {
     *     // ... filter to delete one TranslationHistory
     *   }
     * })
     * 
     */
    delete<T extends TranslationHistoryDeleteArgs>(args: SelectSubset<T, TranslationHistoryDeleteArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TranslationHistory.
     * @param {TranslationHistoryUpdateArgs} args - Arguments to update one TranslationHistory.
     * @example
     * // Update one TranslationHistory
     * const translationHistory = await prisma.translationHistory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TranslationHistoryUpdateArgs>(args: SelectSubset<T, TranslationHistoryUpdateArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TranslationHistories.
     * @param {TranslationHistoryDeleteManyArgs} args - Arguments to filter TranslationHistories to delete.
     * @example
     * // Delete a few TranslationHistories
     * const { count } = await prisma.translationHistory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TranslationHistoryDeleteManyArgs>(args?: SelectSubset<T, TranslationHistoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TranslationHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TranslationHistories
     * const translationHistory = await prisma.translationHistory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TranslationHistoryUpdateManyArgs>(args: SelectSubset<T, TranslationHistoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TranslationHistories and returns the data updated in the database.
     * @param {TranslationHistoryUpdateManyAndReturnArgs} args - Arguments to update many TranslationHistories.
     * @example
     * // Update many TranslationHistories
     * const translationHistory = await prisma.translationHistory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TranslationHistories and only return the `id`
     * const translationHistoryWithIdOnly = await prisma.translationHistory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TranslationHistoryUpdateManyAndReturnArgs>(args: SelectSubset<T, TranslationHistoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TranslationHistory.
     * @param {TranslationHistoryUpsertArgs} args - Arguments to update or create a TranslationHistory.
     * @example
     * // Update or create a TranslationHistory
     * const translationHistory = await prisma.translationHistory.upsert({
     *   create: {
     *     // ... data to create a TranslationHistory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TranslationHistory we want to update
     *   }
     * })
     */
    upsert<T extends TranslationHistoryUpsertArgs>(args: SelectSubset<T, TranslationHistoryUpsertArgs<ExtArgs>>): Prisma__TranslationHistoryClient<$Result.GetResult<Prisma.$TranslationHistoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TranslationHistories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryCountArgs} args - Arguments to filter TranslationHistories to count.
     * @example
     * // Count the number of TranslationHistories
     * const count = await prisma.translationHistory.count({
     *   where: {
     *     // ... the filter for the TranslationHistories we want to count
     *   }
     * })
    **/
    count<T extends TranslationHistoryCountArgs>(
      args?: Subset<T, TranslationHistoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TranslationHistoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TranslationHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TranslationHistoryAggregateArgs>(args: Subset<T, TranslationHistoryAggregateArgs>): Prisma.PrismaPromise<GetTranslationHistoryAggregateType<T>>

    /**
     * Group by TranslationHistory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TranslationHistoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TranslationHistoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TranslationHistoryGroupByArgs['orderBy'] }
        : { orderBy?: TranslationHistoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TranslationHistoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTranslationHistoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TranslationHistory model
   */
  readonly fields: TranslationHistoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TranslationHistory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TranslationHistoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    translation<T extends TranslationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TranslationDefaultArgs<ExtArgs>>): Prisma__TranslationClient<$Result.GetResult<Prisma.$TranslationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TranslationHistory model
   */
  interface TranslationHistoryFieldRefs {
    readonly id: FieldRef<"TranslationHistory", 'String'>
    readonly translationId: FieldRef<"TranslationHistory", 'String'>
    readonly projectId: FieldRef<"TranslationHistory", 'String'>
    readonly language: FieldRef<"TranslationHistory", 'String'>
    readonly key: FieldRef<"TranslationHistory", 'String'>
    readonly value: FieldRef<"TranslationHistory", 'String'>
    readonly userId: FieldRef<"TranslationHistory", 'String'>
    readonly action: FieldRef<"TranslationHistory", 'String'>
    readonly commitSha: FieldRef<"TranslationHistory", 'String'>
    readonly createdAt: FieldRef<"TranslationHistory", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TranslationHistory findUnique
   */
  export type TranslationHistoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TranslationHistory to fetch.
     */
    where: TranslationHistoryWhereUniqueInput
  }

  /**
   * TranslationHistory findUniqueOrThrow
   */
  export type TranslationHistoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TranslationHistory to fetch.
     */
    where: TranslationHistoryWhereUniqueInput
  }

  /**
   * TranslationHistory findFirst
   */
  export type TranslationHistoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TranslationHistory to fetch.
     */
    where?: TranslationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TranslationHistories to fetch.
     */
    orderBy?: TranslationHistoryOrderByWithRelationInput | TranslationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TranslationHistories.
     */
    cursor?: TranslationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TranslationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TranslationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TranslationHistories.
     */
    distinct?: TranslationHistoryScalarFieldEnum | TranslationHistoryScalarFieldEnum[]
  }

  /**
   * TranslationHistory findFirstOrThrow
   */
  export type TranslationHistoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TranslationHistory to fetch.
     */
    where?: TranslationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TranslationHistories to fetch.
     */
    orderBy?: TranslationHistoryOrderByWithRelationInput | TranslationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TranslationHistories.
     */
    cursor?: TranslationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TranslationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TranslationHistories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TranslationHistories.
     */
    distinct?: TranslationHistoryScalarFieldEnum | TranslationHistoryScalarFieldEnum[]
  }

  /**
   * TranslationHistory findMany
   */
  export type TranslationHistoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * Filter, which TranslationHistories to fetch.
     */
    where?: TranslationHistoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TranslationHistories to fetch.
     */
    orderBy?: TranslationHistoryOrderByWithRelationInput | TranslationHistoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TranslationHistories.
     */
    cursor?: TranslationHistoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TranslationHistories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TranslationHistories.
     */
    skip?: number
    distinct?: TranslationHistoryScalarFieldEnum | TranslationHistoryScalarFieldEnum[]
  }

  /**
   * TranslationHistory create
   */
  export type TranslationHistoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * The data needed to create a TranslationHistory.
     */
    data: XOR<TranslationHistoryCreateInput, TranslationHistoryUncheckedCreateInput>
  }

  /**
   * TranslationHistory createMany
   */
  export type TranslationHistoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TranslationHistories.
     */
    data: TranslationHistoryCreateManyInput | TranslationHistoryCreateManyInput[]
  }

  /**
   * TranslationHistory createManyAndReturn
   */
  export type TranslationHistoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * The data used to create many TranslationHistories.
     */
    data: TranslationHistoryCreateManyInput | TranslationHistoryCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TranslationHistory update
   */
  export type TranslationHistoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * The data needed to update a TranslationHistory.
     */
    data: XOR<TranslationHistoryUpdateInput, TranslationHistoryUncheckedUpdateInput>
    /**
     * Choose, which TranslationHistory to update.
     */
    where: TranslationHistoryWhereUniqueInput
  }

  /**
   * TranslationHistory updateMany
   */
  export type TranslationHistoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TranslationHistories.
     */
    data: XOR<TranslationHistoryUpdateManyMutationInput, TranslationHistoryUncheckedUpdateManyInput>
    /**
     * Filter which TranslationHistories to update
     */
    where?: TranslationHistoryWhereInput
    /**
     * Limit how many TranslationHistories to update.
     */
    limit?: number
  }

  /**
   * TranslationHistory updateManyAndReturn
   */
  export type TranslationHistoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * The data used to update TranslationHistories.
     */
    data: XOR<TranslationHistoryUpdateManyMutationInput, TranslationHistoryUncheckedUpdateManyInput>
    /**
     * Filter which TranslationHistories to update
     */
    where?: TranslationHistoryWhereInput
    /**
     * Limit how many TranslationHistories to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TranslationHistory upsert
   */
  export type TranslationHistoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * The filter to search for the TranslationHistory to update in case it exists.
     */
    where: TranslationHistoryWhereUniqueInput
    /**
     * In case the TranslationHistory found by the `where` argument doesn't exist, create a new TranslationHistory with this data.
     */
    create: XOR<TranslationHistoryCreateInput, TranslationHistoryUncheckedCreateInput>
    /**
     * In case the TranslationHistory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TranslationHistoryUpdateInput, TranslationHistoryUncheckedUpdateInput>
  }

  /**
   * TranslationHistory delete
   */
  export type TranslationHistoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
    /**
     * Filter which TranslationHistory to delete.
     */
    where: TranslationHistoryWhereUniqueInput
  }

  /**
   * TranslationHistory deleteMany
   */
  export type TranslationHistoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TranslationHistories to delete
     */
    where?: TranslationHistoryWhereInput
    /**
     * Limit how many TranslationHistories to delete.
     */
    limit?: number
  }

  /**
   * TranslationHistory without action
   */
  export type TranslationHistoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TranslationHistory
     */
    select?: TranslationHistorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the TranslationHistory
     */
    omit?: TranslationHistoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TranslationHistoryInclude<ExtArgs> | null
  }


  /**
   * Model Project
   */

  export type AggregateProject = {
    _count: ProjectCountAggregateOutputType | null
    _min: ProjectMinAggregateOutputType | null
    _max: ProjectMaxAggregateOutputType | null
  }

  export type ProjectMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    repository: string | null
    accessControl: string | null
    sourceLanguage: string | null
    createdAt: Date | null
  }

  export type ProjectMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    repository: string | null
    accessControl: string | null
    sourceLanguage: string | null
    createdAt: Date | null
  }

  export type ProjectCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    repository: number
    accessControl: number
    sourceLanguage: number
    createdAt: number
    _all: number
  }


  export type ProjectMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    repository?: true
    accessControl?: true
    sourceLanguage?: true
    createdAt?: true
  }

  export type ProjectMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    repository?: true
    accessControl?: true
    sourceLanguage?: true
    createdAt?: true
  }

  export type ProjectCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    repository?: true
    accessControl?: true
    sourceLanguage?: true
    createdAt?: true
    _all?: true
  }

  export type ProjectAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Project to aggregate.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Projects
    **/
    _count?: true | ProjectCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProjectMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProjectMaxAggregateInputType
  }

  export type GetProjectAggregateType<T extends ProjectAggregateArgs> = {
        [P in keyof T & keyof AggregateProject]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProject[P]>
      : GetScalarType<T[P], AggregateProject[P]>
  }




  export type ProjectGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectWhereInput
    orderBy?: ProjectOrderByWithAggregationInput | ProjectOrderByWithAggregationInput[]
    by: ProjectScalarFieldEnum[] | ProjectScalarFieldEnum
    having?: ProjectScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProjectCountAggregateInputType | true
    _min?: ProjectMinAggregateInputType
    _max?: ProjectMaxAggregateInputType
  }

  export type ProjectGroupByOutputType = {
    id: string
    userId: string
    name: string
    repository: string
    accessControl: string
    sourceLanguage: string
    createdAt: Date
    _count: ProjectCountAggregateOutputType | null
    _min: ProjectMinAggregateOutputType | null
    _max: ProjectMaxAggregateOutputType | null
  }

  type GetProjectGroupByPayload<T extends ProjectGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProjectGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProjectGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProjectGroupByOutputType[P]>
            : GetScalarType<T[P], ProjectGroupByOutputType[P]>
        }
      >
    >


  export type ProjectSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    repository?: boolean
    accessControl?: boolean
    sourceLanguage?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    members?: boolean | Project$membersArgs<ExtArgs>
    _count?: boolean | ProjectCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["project"]>

  export type ProjectSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    repository?: boolean
    accessControl?: boolean
    sourceLanguage?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["project"]>

  export type ProjectSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    repository?: boolean
    accessControl?: boolean
    sourceLanguage?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["project"]>

  export type ProjectSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    repository?: boolean
    accessControl?: boolean
    sourceLanguage?: boolean
    createdAt?: boolean
  }

  export type ProjectOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "repository" | "accessControl" | "sourceLanguage" | "createdAt", ExtArgs["result"]["project"]>
  export type ProjectInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    members?: boolean | Project$membersArgs<ExtArgs>
    _count?: boolean | ProjectCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ProjectIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ProjectIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ProjectPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Project"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      members: Prisma.$ProjectMemberPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      repository: string
      accessControl: string
      sourceLanguage: string
      createdAt: Date
    }, ExtArgs["result"]["project"]>
    composites: {}
  }

  type ProjectGetPayload<S extends boolean | null | undefined | ProjectDefaultArgs> = $Result.GetResult<Prisma.$ProjectPayload, S>

  type ProjectCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProjectFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProjectCountAggregateInputType | true
    }

  export interface ProjectDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Project'], meta: { name: 'Project' } }
    /**
     * Find zero or one Project that matches the filter.
     * @param {ProjectFindUniqueArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProjectFindUniqueArgs>(args: SelectSubset<T, ProjectFindUniqueArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Project that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProjectFindUniqueOrThrowArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProjectFindUniqueOrThrowArgs>(args: SelectSubset<T, ProjectFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Project that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFindFirstArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProjectFindFirstArgs>(args?: SelectSubset<T, ProjectFindFirstArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Project that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFindFirstOrThrowArgs} args - Arguments to find a Project
     * @example
     * // Get one Project
     * const project = await prisma.project.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProjectFindFirstOrThrowArgs>(args?: SelectSubset<T, ProjectFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Projects that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Projects
     * const projects = await prisma.project.findMany()
     * 
     * // Get first 10 Projects
     * const projects = await prisma.project.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const projectWithIdOnly = await prisma.project.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProjectFindManyArgs>(args?: SelectSubset<T, ProjectFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Project.
     * @param {ProjectCreateArgs} args - Arguments to create a Project.
     * @example
     * // Create one Project
     * const Project = await prisma.project.create({
     *   data: {
     *     // ... data to create a Project
     *   }
     * })
     * 
     */
    create<T extends ProjectCreateArgs>(args: SelectSubset<T, ProjectCreateArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Projects.
     * @param {ProjectCreateManyArgs} args - Arguments to create many Projects.
     * @example
     * // Create many Projects
     * const project = await prisma.project.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProjectCreateManyArgs>(args?: SelectSubset<T, ProjectCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Projects and returns the data saved in the database.
     * @param {ProjectCreateManyAndReturnArgs} args - Arguments to create many Projects.
     * @example
     * // Create many Projects
     * const project = await prisma.project.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Projects and only return the `id`
     * const projectWithIdOnly = await prisma.project.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProjectCreateManyAndReturnArgs>(args?: SelectSubset<T, ProjectCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Project.
     * @param {ProjectDeleteArgs} args - Arguments to delete one Project.
     * @example
     * // Delete one Project
     * const Project = await prisma.project.delete({
     *   where: {
     *     // ... filter to delete one Project
     *   }
     * })
     * 
     */
    delete<T extends ProjectDeleteArgs>(args: SelectSubset<T, ProjectDeleteArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Project.
     * @param {ProjectUpdateArgs} args - Arguments to update one Project.
     * @example
     * // Update one Project
     * const project = await prisma.project.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProjectUpdateArgs>(args: SelectSubset<T, ProjectUpdateArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Projects.
     * @param {ProjectDeleteManyArgs} args - Arguments to filter Projects to delete.
     * @example
     * // Delete a few Projects
     * const { count } = await prisma.project.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProjectDeleteManyArgs>(args?: SelectSubset<T, ProjectDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Projects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Projects
     * const project = await prisma.project.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProjectUpdateManyArgs>(args: SelectSubset<T, ProjectUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Projects and returns the data updated in the database.
     * @param {ProjectUpdateManyAndReturnArgs} args - Arguments to update many Projects.
     * @example
     * // Update many Projects
     * const project = await prisma.project.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Projects and only return the `id`
     * const projectWithIdOnly = await prisma.project.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProjectUpdateManyAndReturnArgs>(args: SelectSubset<T, ProjectUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Project.
     * @param {ProjectUpsertArgs} args - Arguments to update or create a Project.
     * @example
     * // Update or create a Project
     * const project = await prisma.project.upsert({
     *   create: {
     *     // ... data to create a Project
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Project we want to update
     *   }
     * })
     */
    upsert<T extends ProjectUpsertArgs>(args: SelectSubset<T, ProjectUpsertArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Projects.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectCountArgs} args - Arguments to filter Projects to count.
     * @example
     * // Count the number of Projects
     * const count = await prisma.project.count({
     *   where: {
     *     // ... the filter for the Projects we want to count
     *   }
     * })
    **/
    count<T extends ProjectCountArgs>(
      args?: Subset<T, ProjectCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProjectCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Project.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProjectAggregateArgs>(args: Subset<T, ProjectAggregateArgs>): Prisma.PrismaPromise<GetProjectAggregateType<T>>

    /**
     * Group by Project.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProjectGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProjectGroupByArgs['orderBy'] }
        : { orderBy?: ProjectGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProjectGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProjectGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Project model
   */
  readonly fields: ProjectFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Project.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProjectClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    members<T extends Project$membersArgs<ExtArgs> = {}>(args?: Subset<T, Project$membersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Project model
   */
  interface ProjectFieldRefs {
    readonly id: FieldRef<"Project", 'String'>
    readonly userId: FieldRef<"Project", 'String'>
    readonly name: FieldRef<"Project", 'String'>
    readonly repository: FieldRef<"Project", 'String'>
    readonly accessControl: FieldRef<"Project", 'String'>
    readonly sourceLanguage: FieldRef<"Project", 'String'>
    readonly createdAt: FieldRef<"Project", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Project findUnique
   */
  export type ProjectFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project findUniqueOrThrow
   */
  export type ProjectFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project findFirst
   */
  export type ProjectFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Projects.
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Projects.
     */
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * Project findFirstOrThrow
   */
  export type ProjectFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Project to fetch.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Projects.
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Projects.
     */
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * Project findMany
   */
  export type ProjectFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter, which Projects to fetch.
     */
    where?: ProjectWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Projects to fetch.
     */
    orderBy?: ProjectOrderByWithRelationInput | ProjectOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Projects.
     */
    cursor?: ProjectWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Projects from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Projects.
     */
    skip?: number
    distinct?: ProjectScalarFieldEnum | ProjectScalarFieldEnum[]
  }

  /**
   * Project create
   */
  export type ProjectCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * The data needed to create a Project.
     */
    data: XOR<ProjectCreateInput, ProjectUncheckedCreateInput>
  }

  /**
   * Project createMany
   */
  export type ProjectCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Projects.
     */
    data: ProjectCreateManyInput | ProjectCreateManyInput[]
  }

  /**
   * Project createManyAndReturn
   */
  export type ProjectCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * The data used to create many Projects.
     */
    data: ProjectCreateManyInput | ProjectCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Project update
   */
  export type ProjectUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * The data needed to update a Project.
     */
    data: XOR<ProjectUpdateInput, ProjectUncheckedUpdateInput>
    /**
     * Choose, which Project to update.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project updateMany
   */
  export type ProjectUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Projects.
     */
    data: XOR<ProjectUpdateManyMutationInput, ProjectUncheckedUpdateManyInput>
    /**
     * Filter which Projects to update
     */
    where?: ProjectWhereInput
    /**
     * Limit how many Projects to update.
     */
    limit?: number
  }

  /**
   * Project updateManyAndReturn
   */
  export type ProjectUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * The data used to update Projects.
     */
    data: XOR<ProjectUpdateManyMutationInput, ProjectUncheckedUpdateManyInput>
    /**
     * Filter which Projects to update
     */
    where?: ProjectWhereInput
    /**
     * Limit how many Projects to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Project upsert
   */
  export type ProjectUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * The filter to search for the Project to update in case it exists.
     */
    where: ProjectWhereUniqueInput
    /**
     * In case the Project found by the `where` argument doesn't exist, create a new Project with this data.
     */
    create: XOR<ProjectCreateInput, ProjectUncheckedCreateInput>
    /**
     * In case the Project was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProjectUpdateInput, ProjectUncheckedUpdateInput>
  }

  /**
   * Project delete
   */
  export type ProjectDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
    /**
     * Filter which Project to delete.
     */
    where: ProjectWhereUniqueInput
  }

  /**
   * Project deleteMany
   */
  export type ProjectDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Projects to delete
     */
    where?: ProjectWhereInput
    /**
     * Limit how many Projects to delete.
     */
    limit?: number
  }

  /**
   * Project.members
   */
  export type Project$membersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    cursor?: ProjectMemberWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * Project without action
   */
  export type ProjectDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Project
     */
    select?: ProjectSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Project
     */
    omit?: ProjectOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectInclude<ExtArgs> | null
  }


  /**
   * Model ProjectMember
   */

  export type AggregateProjectMember = {
    _count: ProjectMemberCountAggregateOutputType | null
    _min: ProjectMemberMinAggregateOutputType | null
    _max: ProjectMemberMaxAggregateOutputType | null
  }

  export type ProjectMemberMinAggregateOutputType = {
    id: string | null
    projectId: string | null
    userId: string | null
    status: string | null
    role: string | null
    addedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProjectMemberMaxAggregateOutputType = {
    id: string | null
    projectId: string | null
    userId: string | null
    status: string | null
    role: string | null
    addedBy: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProjectMemberCountAggregateOutputType = {
    id: number
    projectId: number
    userId: number
    status: number
    role: number
    addedBy: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProjectMemberMinAggregateInputType = {
    id?: true
    projectId?: true
    userId?: true
    status?: true
    role?: true
    addedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProjectMemberMaxAggregateInputType = {
    id?: true
    projectId?: true
    userId?: true
    status?: true
    role?: true
    addedBy?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProjectMemberCountAggregateInputType = {
    id?: true
    projectId?: true
    userId?: true
    status?: true
    role?: true
    addedBy?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProjectMemberAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProjectMember to aggregate.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProjectMembers
    **/
    _count?: true | ProjectMemberCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProjectMemberMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProjectMemberMaxAggregateInputType
  }

  export type GetProjectMemberAggregateType<T extends ProjectMemberAggregateArgs> = {
        [P in keyof T & keyof AggregateProjectMember]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProjectMember[P]>
      : GetScalarType<T[P], AggregateProjectMember[P]>
  }




  export type ProjectMemberGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProjectMemberWhereInput
    orderBy?: ProjectMemberOrderByWithAggregationInput | ProjectMemberOrderByWithAggregationInput[]
    by: ProjectMemberScalarFieldEnum[] | ProjectMemberScalarFieldEnum
    having?: ProjectMemberScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProjectMemberCountAggregateInputType | true
    _min?: ProjectMemberMinAggregateInputType
    _max?: ProjectMemberMaxAggregateInputType
  }

  export type ProjectMemberGroupByOutputType = {
    id: string
    projectId: string
    userId: string
    status: string
    role: string
    addedBy: string | null
    createdAt: Date
    updatedAt: Date
    _count: ProjectMemberCountAggregateOutputType | null
    _min: ProjectMemberMinAggregateOutputType | null
    _max: ProjectMemberMaxAggregateOutputType | null
  }

  type GetProjectMemberGroupByPayload<T extends ProjectMemberGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProjectMemberGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProjectMemberGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProjectMemberGroupByOutputType[P]>
            : GetScalarType<T[P], ProjectMemberGroupByOutputType[P]>
        }
      >
    >


  export type ProjectMemberSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    userId?: boolean
    status?: boolean
    role?: boolean
    addedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    addedByUser?: boolean | ProjectMember$addedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["projectMember"]>

  export type ProjectMemberSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    userId?: boolean
    status?: boolean
    role?: boolean
    addedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    addedByUser?: boolean | ProjectMember$addedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["projectMember"]>

  export type ProjectMemberSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    projectId?: boolean
    userId?: boolean
    status?: boolean
    role?: boolean
    addedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    addedByUser?: boolean | ProjectMember$addedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["projectMember"]>

  export type ProjectMemberSelectScalar = {
    id?: boolean
    projectId?: boolean
    userId?: boolean
    status?: boolean
    role?: boolean
    addedBy?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProjectMemberOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "projectId" | "userId" | "status" | "role" | "addedBy" | "createdAt" | "updatedAt", ExtArgs["result"]["projectMember"]>
  export type ProjectMemberInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    addedByUser?: boolean | ProjectMember$addedByUserArgs<ExtArgs>
  }
  export type ProjectMemberIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    addedByUser?: boolean | ProjectMember$addedByUserArgs<ExtArgs>
  }
  export type ProjectMemberIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    project?: boolean | ProjectDefaultArgs<ExtArgs>
    user?: boolean | UserDefaultArgs<ExtArgs>
    addedByUser?: boolean | ProjectMember$addedByUserArgs<ExtArgs>
  }

  export type $ProjectMemberPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProjectMember"
    objects: {
      project: Prisma.$ProjectPayload<ExtArgs>
      user: Prisma.$UserPayload<ExtArgs>
      addedByUser: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      projectId: string
      userId: string
      status: string
      role: string
      addedBy: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["projectMember"]>
    composites: {}
  }

  type ProjectMemberGetPayload<S extends boolean | null | undefined | ProjectMemberDefaultArgs> = $Result.GetResult<Prisma.$ProjectMemberPayload, S>

  type ProjectMemberCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProjectMemberFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProjectMemberCountAggregateInputType | true
    }

  export interface ProjectMemberDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProjectMember'], meta: { name: 'ProjectMember' } }
    /**
     * Find zero or one ProjectMember that matches the filter.
     * @param {ProjectMemberFindUniqueArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProjectMemberFindUniqueArgs>(args: SelectSubset<T, ProjectMemberFindUniqueArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProjectMember that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProjectMemberFindUniqueOrThrowArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProjectMemberFindUniqueOrThrowArgs>(args: SelectSubset<T, ProjectMemberFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProjectMember that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberFindFirstArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProjectMemberFindFirstArgs>(args?: SelectSubset<T, ProjectMemberFindFirstArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProjectMember that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberFindFirstOrThrowArgs} args - Arguments to find a ProjectMember
     * @example
     * // Get one ProjectMember
     * const projectMember = await prisma.projectMember.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProjectMemberFindFirstOrThrowArgs>(args?: SelectSubset<T, ProjectMemberFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProjectMembers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProjectMembers
     * const projectMembers = await prisma.projectMember.findMany()
     * 
     * // Get first 10 ProjectMembers
     * const projectMembers = await prisma.projectMember.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const projectMemberWithIdOnly = await prisma.projectMember.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProjectMemberFindManyArgs>(args?: SelectSubset<T, ProjectMemberFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProjectMember.
     * @param {ProjectMemberCreateArgs} args - Arguments to create a ProjectMember.
     * @example
     * // Create one ProjectMember
     * const ProjectMember = await prisma.projectMember.create({
     *   data: {
     *     // ... data to create a ProjectMember
     *   }
     * })
     * 
     */
    create<T extends ProjectMemberCreateArgs>(args: SelectSubset<T, ProjectMemberCreateArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProjectMembers.
     * @param {ProjectMemberCreateManyArgs} args - Arguments to create many ProjectMembers.
     * @example
     * // Create many ProjectMembers
     * const projectMember = await prisma.projectMember.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProjectMemberCreateManyArgs>(args?: SelectSubset<T, ProjectMemberCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProjectMembers and returns the data saved in the database.
     * @param {ProjectMemberCreateManyAndReturnArgs} args - Arguments to create many ProjectMembers.
     * @example
     * // Create many ProjectMembers
     * const projectMember = await prisma.projectMember.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProjectMembers and only return the `id`
     * const projectMemberWithIdOnly = await prisma.projectMember.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProjectMemberCreateManyAndReturnArgs>(args?: SelectSubset<T, ProjectMemberCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProjectMember.
     * @param {ProjectMemberDeleteArgs} args - Arguments to delete one ProjectMember.
     * @example
     * // Delete one ProjectMember
     * const ProjectMember = await prisma.projectMember.delete({
     *   where: {
     *     // ... filter to delete one ProjectMember
     *   }
     * })
     * 
     */
    delete<T extends ProjectMemberDeleteArgs>(args: SelectSubset<T, ProjectMemberDeleteArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProjectMember.
     * @param {ProjectMemberUpdateArgs} args - Arguments to update one ProjectMember.
     * @example
     * // Update one ProjectMember
     * const projectMember = await prisma.projectMember.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProjectMemberUpdateArgs>(args: SelectSubset<T, ProjectMemberUpdateArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProjectMembers.
     * @param {ProjectMemberDeleteManyArgs} args - Arguments to filter ProjectMembers to delete.
     * @example
     * // Delete a few ProjectMembers
     * const { count } = await prisma.projectMember.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProjectMemberDeleteManyArgs>(args?: SelectSubset<T, ProjectMemberDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProjectMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProjectMembers
     * const projectMember = await prisma.projectMember.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProjectMemberUpdateManyArgs>(args: SelectSubset<T, ProjectMemberUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProjectMembers and returns the data updated in the database.
     * @param {ProjectMemberUpdateManyAndReturnArgs} args - Arguments to update many ProjectMembers.
     * @example
     * // Update many ProjectMembers
     * const projectMember = await prisma.projectMember.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProjectMembers and only return the `id`
     * const projectMemberWithIdOnly = await prisma.projectMember.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProjectMemberUpdateManyAndReturnArgs>(args: SelectSubset<T, ProjectMemberUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProjectMember.
     * @param {ProjectMemberUpsertArgs} args - Arguments to update or create a ProjectMember.
     * @example
     * // Update or create a ProjectMember
     * const projectMember = await prisma.projectMember.upsert({
     *   create: {
     *     // ... data to create a ProjectMember
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProjectMember we want to update
     *   }
     * })
     */
    upsert<T extends ProjectMemberUpsertArgs>(args: SelectSubset<T, ProjectMemberUpsertArgs<ExtArgs>>): Prisma__ProjectMemberClient<$Result.GetResult<Prisma.$ProjectMemberPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProjectMembers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberCountArgs} args - Arguments to filter ProjectMembers to count.
     * @example
     * // Count the number of ProjectMembers
     * const count = await prisma.projectMember.count({
     *   where: {
     *     // ... the filter for the ProjectMembers we want to count
     *   }
     * })
    **/
    count<T extends ProjectMemberCountArgs>(
      args?: Subset<T, ProjectMemberCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProjectMemberCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProjectMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProjectMemberAggregateArgs>(args: Subset<T, ProjectMemberAggregateArgs>): Prisma.PrismaPromise<GetProjectMemberAggregateType<T>>

    /**
     * Group by ProjectMember.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProjectMemberGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProjectMemberGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProjectMemberGroupByArgs['orderBy'] }
        : { orderBy?: ProjectMemberGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProjectMemberGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProjectMemberGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProjectMember model
   */
  readonly fields: ProjectMemberFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProjectMember.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProjectMemberClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    project<T extends ProjectDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProjectDefaultArgs<ExtArgs>>): Prisma__ProjectClient<$Result.GetResult<Prisma.$ProjectPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    addedByUser<T extends ProjectMember$addedByUserArgs<ExtArgs> = {}>(args?: Subset<T, ProjectMember$addedByUserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProjectMember model
   */
  interface ProjectMemberFieldRefs {
    readonly id: FieldRef<"ProjectMember", 'String'>
    readonly projectId: FieldRef<"ProjectMember", 'String'>
    readonly userId: FieldRef<"ProjectMember", 'String'>
    readonly status: FieldRef<"ProjectMember", 'String'>
    readonly role: FieldRef<"ProjectMember", 'String'>
    readonly addedBy: FieldRef<"ProjectMember", 'String'>
    readonly createdAt: FieldRef<"ProjectMember", 'DateTime'>
    readonly updatedAt: FieldRef<"ProjectMember", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProjectMember findUnique
   */
  export type ProjectMemberFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember findUniqueOrThrow
   */
  export type ProjectMemberFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember findFirst
   */
  export type ProjectMemberFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProjectMembers.
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProjectMembers.
     */
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * ProjectMember findFirstOrThrow
   */
  export type ProjectMemberFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMember to fetch.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProjectMembers.
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProjectMembers.
     */
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * ProjectMember findMany
   */
  export type ProjectMemberFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter, which ProjectMembers to fetch.
     */
    where?: ProjectMemberWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProjectMembers to fetch.
     */
    orderBy?: ProjectMemberOrderByWithRelationInput | ProjectMemberOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProjectMembers.
     */
    cursor?: ProjectMemberWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProjectMembers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProjectMembers.
     */
    skip?: number
    distinct?: ProjectMemberScalarFieldEnum | ProjectMemberScalarFieldEnum[]
  }

  /**
   * ProjectMember create
   */
  export type ProjectMemberCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * The data needed to create a ProjectMember.
     */
    data: XOR<ProjectMemberCreateInput, ProjectMemberUncheckedCreateInput>
  }

  /**
   * ProjectMember createMany
   */
  export type ProjectMemberCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProjectMembers.
     */
    data: ProjectMemberCreateManyInput | ProjectMemberCreateManyInput[]
  }

  /**
   * ProjectMember createManyAndReturn
   */
  export type ProjectMemberCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * The data used to create many ProjectMembers.
     */
    data: ProjectMemberCreateManyInput | ProjectMemberCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProjectMember update
   */
  export type ProjectMemberUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * The data needed to update a ProjectMember.
     */
    data: XOR<ProjectMemberUpdateInput, ProjectMemberUncheckedUpdateInput>
    /**
     * Choose, which ProjectMember to update.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember updateMany
   */
  export type ProjectMemberUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProjectMembers.
     */
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyInput>
    /**
     * Filter which ProjectMembers to update
     */
    where?: ProjectMemberWhereInput
    /**
     * Limit how many ProjectMembers to update.
     */
    limit?: number
  }

  /**
   * ProjectMember updateManyAndReturn
   */
  export type ProjectMemberUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * The data used to update ProjectMembers.
     */
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyInput>
    /**
     * Filter which ProjectMembers to update
     */
    where?: ProjectMemberWhereInput
    /**
     * Limit how many ProjectMembers to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProjectMember upsert
   */
  export type ProjectMemberUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * The filter to search for the ProjectMember to update in case it exists.
     */
    where: ProjectMemberWhereUniqueInput
    /**
     * In case the ProjectMember found by the `where` argument doesn't exist, create a new ProjectMember with this data.
     */
    create: XOR<ProjectMemberCreateInput, ProjectMemberUncheckedCreateInput>
    /**
     * In case the ProjectMember was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProjectMemberUpdateInput, ProjectMemberUncheckedUpdateInput>
  }

  /**
   * ProjectMember delete
   */
  export type ProjectMemberDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
    /**
     * Filter which ProjectMember to delete.
     */
    where: ProjectMemberWhereUniqueInput
  }

  /**
   * ProjectMember deleteMany
   */
  export type ProjectMemberDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProjectMembers to delete
     */
    where?: ProjectMemberWhereInput
    /**
     * Limit how many ProjectMembers to delete.
     */
    limit?: number
  }

  /**
   * ProjectMember.addedByUser
   */
  export type ProjectMember$addedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * ProjectMember without action
   */
  export type ProjectMemberDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProjectMember
     */
    select?: ProjectMemberSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProjectMember
     */
    omit?: ProjectMemberOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProjectMemberInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    githubId: 'githubId',
    username: 'username',
    email: 'email',
    avatarUrl: 'avatarUrl',
    createdAt: 'createdAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const OauthStateScalarFieldEnum: {
    state: 'state',
    timestamp: 'timestamp',
    expiresAt: 'expiresAt'
  };

  export type OauthStateScalarFieldEnum = (typeof OauthStateScalarFieldEnum)[keyof typeof OauthStateScalarFieldEnum]


  export const ProjectFileScalarFieldEnum: {
    id: 'id',
    projectId: 'projectId',
    branch: 'branch',
    commitSha: 'commitSha',
    filename: 'filename',
    filetype: 'filetype',
    lang: 'lang',
    contents: 'contents',
    metadata: 'metadata',
    uploadedAt: 'uploadedAt'
  };

  export type ProjectFileScalarFieldEnum = (typeof ProjectFileScalarFieldEnum)[keyof typeof ProjectFileScalarFieldEnum]


  export const TranslationScalarFieldEnum: {
    id: 'id',
    projectId: 'projectId',
    language: 'language',
    key: 'key',
    value: 'value',
    userId: 'userId',
    status: 'status',
    commitSha: 'commitSha',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TranslationScalarFieldEnum = (typeof TranslationScalarFieldEnum)[keyof typeof TranslationScalarFieldEnum]


  export const TranslationHistoryScalarFieldEnum: {
    id: 'id',
    translationId: 'translationId',
    projectId: 'projectId',
    language: 'language',
    key: 'key',
    value: 'value',
    userId: 'userId',
    action: 'action',
    commitSha: 'commitSha',
    createdAt: 'createdAt'
  };

  export type TranslationHistoryScalarFieldEnum = (typeof TranslationHistoryScalarFieldEnum)[keyof typeof TranslationHistoryScalarFieldEnum]


  export const ProjectScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    repository: 'repository',
    accessControl: 'accessControl',
    sourceLanguage: 'sourceLanguage',
    createdAt: 'createdAt'
  };

  export type ProjectScalarFieldEnum = (typeof ProjectScalarFieldEnum)[keyof typeof ProjectScalarFieldEnum]


  export const ProjectMemberScalarFieldEnum: {
    id: 'id',
    projectId: 'projectId',
    userId: 'userId',
    status: 'status',
    role: 'role',
    addedBy: 'addedBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProjectMemberScalarFieldEnum = (typeof ProjectMemberScalarFieldEnum)[keyof typeof ProjectMemberScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    githubId?: IntFilter<"User"> | number
    username?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    avatarUrl?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    projects?: ProjectListRelationFilter
    translations?: TranslationListRelationFilter
    translationHistory?: TranslationHistoryListRelationFilter
    projectMemberships?: ProjectMemberListRelationFilter
    addedMembers?: ProjectMemberListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    githubId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    projects?: ProjectOrderByRelationAggregateInput
    translations?: TranslationOrderByRelationAggregateInput
    translationHistory?: TranslationHistoryOrderByRelationAggregateInput
    projectMemberships?: ProjectMemberOrderByRelationAggregateInput
    addedMembers?: ProjectMemberOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    githubId?: number
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    username?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    avatarUrl?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    projects?: ProjectListRelationFilter
    translations?: TranslationListRelationFilter
    translationHistory?: TranslationHistoryListRelationFilter
    projectMemberships?: ProjectMemberListRelationFilter
    addedMembers?: ProjectMemberListRelationFilter
  }, "id" | "githubId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    githubId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    githubId?: IntWithAggregatesFilter<"User"> | number
    username?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    avatarUrl?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type OauthStateWhereInput = {
    AND?: OauthStateWhereInput | OauthStateWhereInput[]
    OR?: OauthStateWhereInput[]
    NOT?: OauthStateWhereInput | OauthStateWhereInput[]
    state?: StringFilter<"OauthState"> | string
    timestamp?: IntFilter<"OauthState"> | number
    expiresAt?: DateTimeFilter<"OauthState"> | Date | string
  }

  export type OauthStateOrderByWithRelationInput = {
    state?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
  }

  export type OauthStateWhereUniqueInput = Prisma.AtLeast<{
    state?: string
    AND?: OauthStateWhereInput | OauthStateWhereInput[]
    OR?: OauthStateWhereInput[]
    NOT?: OauthStateWhereInput | OauthStateWhereInput[]
    timestamp?: IntFilter<"OauthState"> | number
    expiresAt?: DateTimeFilter<"OauthState"> | Date | string
  }, "state">

  export type OauthStateOrderByWithAggregationInput = {
    state?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
    _count?: OauthStateCountOrderByAggregateInput
    _avg?: OauthStateAvgOrderByAggregateInput
    _max?: OauthStateMaxOrderByAggregateInput
    _min?: OauthStateMinOrderByAggregateInput
    _sum?: OauthStateSumOrderByAggregateInput
  }

  export type OauthStateScalarWhereWithAggregatesInput = {
    AND?: OauthStateScalarWhereWithAggregatesInput | OauthStateScalarWhereWithAggregatesInput[]
    OR?: OauthStateScalarWhereWithAggregatesInput[]
    NOT?: OauthStateScalarWhereWithAggregatesInput | OauthStateScalarWhereWithAggregatesInput[]
    state?: StringWithAggregatesFilter<"OauthState"> | string
    timestamp?: IntWithAggregatesFilter<"OauthState"> | number
    expiresAt?: DateTimeWithAggregatesFilter<"OauthState"> | Date | string
  }

  export type ProjectFileWhereInput = {
    AND?: ProjectFileWhereInput | ProjectFileWhereInput[]
    OR?: ProjectFileWhereInput[]
    NOT?: ProjectFileWhereInput | ProjectFileWhereInput[]
    id?: StringFilter<"ProjectFile"> | string
    projectId?: StringFilter<"ProjectFile"> | string
    branch?: StringFilter<"ProjectFile"> | string
    commitSha?: StringFilter<"ProjectFile"> | string
    filename?: StringFilter<"ProjectFile"> | string
    filetype?: StringFilter<"ProjectFile"> | string
    lang?: StringFilter<"ProjectFile"> | string
    contents?: StringFilter<"ProjectFile"> | string
    metadata?: StringNullableFilter<"ProjectFile"> | string | null
    uploadedAt?: DateTimeFilter<"ProjectFile"> | Date | string
  }

  export type ProjectFileOrderByWithRelationInput = {
    id?: SortOrder
    projectId?: SortOrder
    branch?: SortOrder
    commitSha?: SortOrder
    filename?: SortOrder
    filetype?: SortOrder
    lang?: SortOrder
    contents?: SortOrder
    metadata?: SortOrderInput | SortOrder
    uploadedAt?: SortOrder
  }

  export type ProjectFileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    projectId_branch_filename_lang?: ProjectFileProjectIdBranchFilenameLangCompoundUniqueInput
    AND?: ProjectFileWhereInput | ProjectFileWhereInput[]
    OR?: ProjectFileWhereInput[]
    NOT?: ProjectFileWhereInput | ProjectFileWhereInput[]
    projectId?: StringFilter<"ProjectFile"> | string
    branch?: StringFilter<"ProjectFile"> | string
    commitSha?: StringFilter<"ProjectFile"> | string
    filename?: StringFilter<"ProjectFile"> | string
    filetype?: StringFilter<"ProjectFile"> | string
    lang?: StringFilter<"ProjectFile"> | string
    contents?: StringFilter<"ProjectFile"> | string
    metadata?: StringNullableFilter<"ProjectFile"> | string | null
    uploadedAt?: DateTimeFilter<"ProjectFile"> | Date | string
  }, "id" | "projectId_branch_filename_lang">

  export type ProjectFileOrderByWithAggregationInput = {
    id?: SortOrder
    projectId?: SortOrder
    branch?: SortOrder
    commitSha?: SortOrder
    filename?: SortOrder
    filetype?: SortOrder
    lang?: SortOrder
    contents?: SortOrder
    metadata?: SortOrderInput | SortOrder
    uploadedAt?: SortOrder
    _count?: ProjectFileCountOrderByAggregateInput
    _max?: ProjectFileMaxOrderByAggregateInput
    _min?: ProjectFileMinOrderByAggregateInput
  }

  export type ProjectFileScalarWhereWithAggregatesInput = {
    AND?: ProjectFileScalarWhereWithAggregatesInput | ProjectFileScalarWhereWithAggregatesInput[]
    OR?: ProjectFileScalarWhereWithAggregatesInput[]
    NOT?: ProjectFileScalarWhereWithAggregatesInput | ProjectFileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProjectFile"> | string
    projectId?: StringWithAggregatesFilter<"ProjectFile"> | string
    branch?: StringWithAggregatesFilter<"ProjectFile"> | string
    commitSha?: StringWithAggregatesFilter<"ProjectFile"> | string
    filename?: StringWithAggregatesFilter<"ProjectFile"> | string
    filetype?: StringWithAggregatesFilter<"ProjectFile"> | string
    lang?: StringWithAggregatesFilter<"ProjectFile"> | string
    contents?: StringWithAggregatesFilter<"ProjectFile"> | string
    metadata?: StringNullableWithAggregatesFilter<"ProjectFile"> | string | null
    uploadedAt?: DateTimeWithAggregatesFilter<"ProjectFile"> | Date | string
  }

  export type TranslationWhereInput = {
    AND?: TranslationWhereInput | TranslationWhereInput[]
    OR?: TranslationWhereInput[]
    NOT?: TranslationWhereInput | TranslationWhereInput[]
    id?: StringFilter<"Translation"> | string
    projectId?: StringFilter<"Translation"> | string
    language?: StringFilter<"Translation"> | string
    key?: StringFilter<"Translation"> | string
    value?: StringFilter<"Translation"> | string
    userId?: StringFilter<"Translation"> | string
    status?: StringFilter<"Translation"> | string
    commitSha?: StringNullableFilter<"Translation"> | string | null
    createdAt?: DateTimeFilter<"Translation"> | Date | string
    updatedAt?: DateTimeFilter<"Translation"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    history?: TranslationHistoryListRelationFilter
  }

  export type TranslationOrderByWithRelationInput = {
    id?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    commitSha?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    history?: TranslationHistoryOrderByRelationAggregateInput
  }

  export type TranslationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TranslationWhereInput | TranslationWhereInput[]
    OR?: TranslationWhereInput[]
    NOT?: TranslationWhereInput | TranslationWhereInput[]
    projectId?: StringFilter<"Translation"> | string
    language?: StringFilter<"Translation"> | string
    key?: StringFilter<"Translation"> | string
    value?: StringFilter<"Translation"> | string
    userId?: StringFilter<"Translation"> | string
    status?: StringFilter<"Translation"> | string
    commitSha?: StringNullableFilter<"Translation"> | string | null
    createdAt?: DateTimeFilter<"Translation"> | Date | string
    updatedAt?: DateTimeFilter<"Translation"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    history?: TranslationHistoryListRelationFilter
  }, "id">

  export type TranslationOrderByWithAggregationInput = {
    id?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    commitSha?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TranslationCountOrderByAggregateInput
    _max?: TranslationMaxOrderByAggregateInput
    _min?: TranslationMinOrderByAggregateInput
  }

  export type TranslationScalarWhereWithAggregatesInput = {
    AND?: TranslationScalarWhereWithAggregatesInput | TranslationScalarWhereWithAggregatesInput[]
    OR?: TranslationScalarWhereWithAggregatesInput[]
    NOT?: TranslationScalarWhereWithAggregatesInput | TranslationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Translation"> | string
    projectId?: StringWithAggregatesFilter<"Translation"> | string
    language?: StringWithAggregatesFilter<"Translation"> | string
    key?: StringWithAggregatesFilter<"Translation"> | string
    value?: StringWithAggregatesFilter<"Translation"> | string
    userId?: StringWithAggregatesFilter<"Translation"> | string
    status?: StringWithAggregatesFilter<"Translation"> | string
    commitSha?: StringNullableWithAggregatesFilter<"Translation"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Translation"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Translation"> | Date | string
  }

  export type TranslationHistoryWhereInput = {
    AND?: TranslationHistoryWhereInput | TranslationHistoryWhereInput[]
    OR?: TranslationHistoryWhereInput[]
    NOT?: TranslationHistoryWhereInput | TranslationHistoryWhereInput[]
    id?: StringFilter<"TranslationHistory"> | string
    translationId?: StringFilter<"TranslationHistory"> | string
    projectId?: StringFilter<"TranslationHistory"> | string
    language?: StringFilter<"TranslationHistory"> | string
    key?: StringFilter<"TranslationHistory"> | string
    value?: StringFilter<"TranslationHistory"> | string
    userId?: StringFilter<"TranslationHistory"> | string
    action?: StringFilter<"TranslationHistory"> | string
    commitSha?: StringNullableFilter<"TranslationHistory"> | string | null
    createdAt?: DateTimeFilter<"TranslationHistory"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    translation?: XOR<TranslationScalarRelationFilter, TranslationWhereInput>
  }

  export type TranslationHistoryOrderByWithRelationInput = {
    id?: SortOrder
    translationId?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    commitSha?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
    translation?: TranslationOrderByWithRelationInput
  }

  export type TranslationHistoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TranslationHistoryWhereInput | TranslationHistoryWhereInput[]
    OR?: TranslationHistoryWhereInput[]
    NOT?: TranslationHistoryWhereInput | TranslationHistoryWhereInput[]
    translationId?: StringFilter<"TranslationHistory"> | string
    projectId?: StringFilter<"TranslationHistory"> | string
    language?: StringFilter<"TranslationHistory"> | string
    key?: StringFilter<"TranslationHistory"> | string
    value?: StringFilter<"TranslationHistory"> | string
    userId?: StringFilter<"TranslationHistory"> | string
    action?: StringFilter<"TranslationHistory"> | string
    commitSha?: StringNullableFilter<"TranslationHistory"> | string | null
    createdAt?: DateTimeFilter<"TranslationHistory"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    translation?: XOR<TranslationScalarRelationFilter, TranslationWhereInput>
  }, "id">

  export type TranslationHistoryOrderByWithAggregationInput = {
    id?: SortOrder
    translationId?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    commitSha?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: TranslationHistoryCountOrderByAggregateInput
    _max?: TranslationHistoryMaxOrderByAggregateInput
    _min?: TranslationHistoryMinOrderByAggregateInput
  }

  export type TranslationHistoryScalarWhereWithAggregatesInput = {
    AND?: TranslationHistoryScalarWhereWithAggregatesInput | TranslationHistoryScalarWhereWithAggregatesInput[]
    OR?: TranslationHistoryScalarWhereWithAggregatesInput[]
    NOT?: TranslationHistoryScalarWhereWithAggregatesInput | TranslationHistoryScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TranslationHistory"> | string
    translationId?: StringWithAggregatesFilter<"TranslationHistory"> | string
    projectId?: StringWithAggregatesFilter<"TranslationHistory"> | string
    language?: StringWithAggregatesFilter<"TranslationHistory"> | string
    key?: StringWithAggregatesFilter<"TranslationHistory"> | string
    value?: StringWithAggregatesFilter<"TranslationHistory"> | string
    userId?: StringWithAggregatesFilter<"TranslationHistory"> | string
    action?: StringWithAggregatesFilter<"TranslationHistory"> | string
    commitSha?: StringNullableWithAggregatesFilter<"TranslationHistory"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"TranslationHistory"> | Date | string
  }

  export type ProjectWhereInput = {
    AND?: ProjectWhereInput | ProjectWhereInput[]
    OR?: ProjectWhereInput[]
    NOT?: ProjectWhereInput | ProjectWhereInput[]
    id?: StringFilter<"Project"> | string
    userId?: StringFilter<"Project"> | string
    name?: StringFilter<"Project"> | string
    repository?: StringFilter<"Project"> | string
    accessControl?: StringFilter<"Project"> | string
    sourceLanguage?: StringFilter<"Project"> | string
    createdAt?: DateTimeFilter<"Project"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    members?: ProjectMemberListRelationFilter
  }

  export type ProjectOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    repository?: SortOrder
    accessControl?: SortOrder
    sourceLanguage?: SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
    members?: ProjectMemberOrderByRelationAggregateInput
  }

  export type ProjectWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    repository?: string
    AND?: ProjectWhereInput | ProjectWhereInput[]
    OR?: ProjectWhereInput[]
    NOT?: ProjectWhereInput | ProjectWhereInput[]
    userId?: StringFilter<"Project"> | string
    accessControl?: StringFilter<"Project"> | string
    sourceLanguage?: StringFilter<"Project"> | string
    createdAt?: DateTimeFilter<"Project"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    members?: ProjectMemberListRelationFilter
  }, "id" | "name" | "repository">

  export type ProjectOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    repository?: SortOrder
    accessControl?: SortOrder
    sourceLanguage?: SortOrder
    createdAt?: SortOrder
    _count?: ProjectCountOrderByAggregateInput
    _max?: ProjectMaxOrderByAggregateInput
    _min?: ProjectMinOrderByAggregateInput
  }

  export type ProjectScalarWhereWithAggregatesInput = {
    AND?: ProjectScalarWhereWithAggregatesInput | ProjectScalarWhereWithAggregatesInput[]
    OR?: ProjectScalarWhereWithAggregatesInput[]
    NOT?: ProjectScalarWhereWithAggregatesInput | ProjectScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Project"> | string
    userId?: StringWithAggregatesFilter<"Project"> | string
    name?: StringWithAggregatesFilter<"Project"> | string
    repository?: StringWithAggregatesFilter<"Project"> | string
    accessControl?: StringWithAggregatesFilter<"Project"> | string
    sourceLanguage?: StringWithAggregatesFilter<"Project"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Project"> | Date | string
  }

  export type ProjectMemberWhereInput = {
    AND?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    OR?: ProjectMemberWhereInput[]
    NOT?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    id?: StringFilter<"ProjectMember"> | string
    projectId?: StringFilter<"ProjectMember"> | string
    userId?: StringFilter<"ProjectMember"> | string
    status?: StringFilter<"ProjectMember"> | string
    role?: StringFilter<"ProjectMember"> | string
    addedBy?: StringNullableFilter<"ProjectMember"> | string | null
    createdAt?: DateTimeFilter<"ProjectMember"> | Date | string
    updatedAt?: DateTimeFilter<"ProjectMember"> | Date | string
    project?: XOR<ProjectScalarRelationFilter, ProjectWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    addedByUser?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type ProjectMemberOrderByWithRelationInput = {
    id?: SortOrder
    projectId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    role?: SortOrder
    addedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    project?: ProjectOrderByWithRelationInput
    user?: UserOrderByWithRelationInput
    addedByUser?: UserOrderByWithRelationInput
  }

  export type ProjectMemberWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    projectId_userId?: ProjectMemberProjectIdUserIdCompoundUniqueInput
    AND?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    OR?: ProjectMemberWhereInput[]
    NOT?: ProjectMemberWhereInput | ProjectMemberWhereInput[]
    projectId?: StringFilter<"ProjectMember"> | string
    userId?: StringFilter<"ProjectMember"> | string
    status?: StringFilter<"ProjectMember"> | string
    role?: StringFilter<"ProjectMember"> | string
    addedBy?: StringNullableFilter<"ProjectMember"> | string | null
    createdAt?: DateTimeFilter<"ProjectMember"> | Date | string
    updatedAt?: DateTimeFilter<"ProjectMember"> | Date | string
    project?: XOR<ProjectScalarRelationFilter, ProjectWhereInput>
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    addedByUser?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id" | "projectId_userId">

  export type ProjectMemberOrderByWithAggregationInput = {
    id?: SortOrder
    projectId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    role?: SortOrder
    addedBy?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProjectMemberCountOrderByAggregateInput
    _max?: ProjectMemberMaxOrderByAggregateInput
    _min?: ProjectMemberMinOrderByAggregateInput
  }

  export type ProjectMemberScalarWhereWithAggregatesInput = {
    AND?: ProjectMemberScalarWhereWithAggregatesInput | ProjectMemberScalarWhereWithAggregatesInput[]
    OR?: ProjectMemberScalarWhereWithAggregatesInput[]
    NOT?: ProjectMemberScalarWhereWithAggregatesInput | ProjectMemberScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProjectMember"> | string
    projectId?: StringWithAggregatesFilter<"ProjectMember"> | string
    userId?: StringWithAggregatesFilter<"ProjectMember"> | string
    status?: StringWithAggregatesFilter<"ProjectMember"> | string
    role?: StringWithAggregatesFilter<"ProjectMember"> | string
    addedBy?: StringNullableWithAggregatesFilter<"ProjectMember"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ProjectMember"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProjectMember"> | Date | string
  }

  export type UserCreateInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectCreateNestedManyWithoutUserInput
    translations?: TranslationCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberCreateNestedManyWithoutAddedByUserInput
  }

  export type UserUncheckedCreateInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectUncheckedCreateNestedManyWithoutUserInput
    translations?: TranslationUncheckedCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryUncheckedCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberUncheckedCreateNestedManyWithoutAddedByUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUpdateManyWithoutUserNestedInput
    translations?: TranslationUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUncheckedUpdateManyWithoutUserNestedInput
    translations?: TranslationUncheckedUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUncheckedUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUncheckedUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserCreateManyInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OauthStateCreateInput = {
    state: string
    timestamp: number
    expiresAt: Date | string
  }

  export type OauthStateUncheckedCreateInput = {
    state: string
    timestamp: number
    expiresAt: Date | string
  }

  export type OauthStateUpdateInput = {
    state?: StringFieldUpdateOperationsInput | string
    timestamp?: IntFieldUpdateOperationsInput | number
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OauthStateUncheckedUpdateInput = {
    state?: StringFieldUpdateOperationsInput | string
    timestamp?: IntFieldUpdateOperationsInput | number
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OauthStateCreateManyInput = {
    state: string
    timestamp: number
    expiresAt: Date | string
  }

  export type OauthStateUpdateManyMutationInput = {
    state?: StringFieldUpdateOperationsInput | string
    timestamp?: IntFieldUpdateOperationsInput | number
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OauthStateUncheckedUpdateManyInput = {
    state?: StringFieldUpdateOperationsInput | string
    timestamp?: IntFieldUpdateOperationsInput | number
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectFileCreateInput = {
    id: string
    projectId: string
    branch: string
    commitSha: string
    filename: string
    filetype: string
    lang: string
    contents: string
    metadata?: string | null
    uploadedAt?: Date | string
  }

  export type ProjectFileUncheckedCreateInput = {
    id: string
    projectId: string
    branch: string
    commitSha: string
    filename: string
    filetype: string
    lang: string
    contents: string
    metadata?: string | null
    uploadedAt?: Date | string
  }

  export type ProjectFileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    branch?: StringFieldUpdateOperationsInput | string
    commitSha?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    filetype?: StringFieldUpdateOperationsInput | string
    lang?: StringFieldUpdateOperationsInput | string
    contents?: StringFieldUpdateOperationsInput | string
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectFileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    branch?: StringFieldUpdateOperationsInput | string
    commitSha?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    filetype?: StringFieldUpdateOperationsInput | string
    lang?: StringFieldUpdateOperationsInput | string
    contents?: StringFieldUpdateOperationsInput | string
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectFileCreateManyInput = {
    id: string
    projectId: string
    branch: string
    commitSha: string
    filename: string
    filetype: string
    lang: string
    contents: string
    metadata?: string | null
    uploadedAt?: Date | string
  }

  export type ProjectFileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    branch?: StringFieldUpdateOperationsInput | string
    commitSha?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    filetype?: StringFieldUpdateOperationsInput | string
    lang?: StringFieldUpdateOperationsInput | string
    contents?: StringFieldUpdateOperationsInput | string
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectFileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    branch?: StringFieldUpdateOperationsInput | string
    commitSha?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    filetype?: StringFieldUpdateOperationsInput | string
    lang?: StringFieldUpdateOperationsInput | string
    contents?: StringFieldUpdateOperationsInput | string
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationCreateInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTranslationsInput
    history?: TranslationHistoryCreateNestedManyWithoutTranslationInput
  }

  export type TranslationUncheckedCreateInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TranslationHistoryUncheckedCreateNestedManyWithoutTranslationInput
  }

  export type TranslationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTranslationsNestedInput
    history?: TranslationHistoryUpdateManyWithoutTranslationNestedInput
  }

  export type TranslationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TranslationHistoryUncheckedUpdateManyWithoutTranslationNestedInput
  }

  export type TranslationCreateManyInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TranslationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryCreateInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutTranslationHistoryInput
    translation: TranslationCreateNestedOneWithoutHistoryInput
  }

  export type TranslationHistoryUncheckedCreateInput = {
    id: string
    translationId: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
  }

  export type TranslationHistoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTranslationHistoryNestedInput
    translation?: TranslationUpdateOneRequiredWithoutHistoryNestedInput
  }

  export type TranslationHistoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    translationId?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryCreateManyInput = {
    id: string
    translationId: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
  }

  export type TranslationHistoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    translationId?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectCreateInput = {
    id: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutProjectsInput
    members?: ProjectMemberCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateInput = {
    id: string
    userId: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
    members?: ProjectMemberUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProjectsNestedInput
    members?: ProjectMemberUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    members?: ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type ProjectCreateManyInput = {
    id: string
    userId: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
  }

  export type ProjectUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberCreateInput = {
    id: string
    status?: string
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    project: ProjectCreateNestedOneWithoutMembersInput
    user: UserCreateNestedOneWithoutProjectMembershipsInput
    addedByUser?: UserCreateNestedOneWithoutAddedMembersInput
  }

  export type ProjectMemberUncheckedCreateInput = {
    id: string
    projectId: string
    userId: string
    status?: string
    role?: string
    addedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutMembersNestedInput
    user?: UserUpdateOneRequiredWithoutProjectMembershipsNestedInput
    addedByUser?: UserUpdateOneWithoutAddedMembersNestedInput
  }

  export type ProjectMemberUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    addedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberCreateManyInput = {
    id: string
    projectId: string
    userId: string
    status?: string
    role?: string
    addedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    addedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ProjectListRelationFilter = {
    every?: ProjectWhereInput
    some?: ProjectWhereInput
    none?: ProjectWhereInput
  }

  export type TranslationListRelationFilter = {
    every?: TranslationWhereInput
    some?: TranslationWhereInput
    none?: TranslationWhereInput
  }

  export type TranslationHistoryListRelationFilter = {
    every?: TranslationHistoryWhereInput
    some?: TranslationHistoryWhereInput
    none?: TranslationHistoryWhereInput
  }

  export type ProjectMemberListRelationFilter = {
    every?: ProjectMemberWhereInput
    some?: ProjectMemberWhereInput
    none?: ProjectMemberWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ProjectOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TranslationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TranslationHistoryOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProjectMemberOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    githubId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    githubId?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    githubId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    githubId?: SortOrder
    username?: SortOrder
    email?: SortOrder
    avatarUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    githubId?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type OauthStateCountOrderByAggregateInput = {
    state?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
  }

  export type OauthStateAvgOrderByAggregateInput = {
    timestamp?: SortOrder
  }

  export type OauthStateMaxOrderByAggregateInput = {
    state?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
  }

  export type OauthStateMinOrderByAggregateInput = {
    state?: SortOrder
    timestamp?: SortOrder
    expiresAt?: SortOrder
  }

  export type OauthStateSumOrderByAggregateInput = {
    timestamp?: SortOrder
  }

  export type ProjectFileProjectIdBranchFilenameLangCompoundUniqueInput = {
    projectId: string
    branch: string
    filename: string
    lang: string
  }

  export type ProjectFileCountOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    branch?: SortOrder
    commitSha?: SortOrder
    filename?: SortOrder
    filetype?: SortOrder
    lang?: SortOrder
    contents?: SortOrder
    metadata?: SortOrder
    uploadedAt?: SortOrder
  }

  export type ProjectFileMaxOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    branch?: SortOrder
    commitSha?: SortOrder
    filename?: SortOrder
    filetype?: SortOrder
    lang?: SortOrder
    contents?: SortOrder
    metadata?: SortOrder
    uploadedAt?: SortOrder
  }

  export type ProjectFileMinOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    branch?: SortOrder
    commitSha?: SortOrder
    filename?: SortOrder
    filetype?: SortOrder
    lang?: SortOrder
    contents?: SortOrder
    metadata?: SortOrder
    uploadedAt?: SortOrder
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type TranslationCountOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    commitSha?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TranslationMaxOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    commitSha?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TranslationMinOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    commitSha?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TranslationScalarRelationFilter = {
    is?: TranslationWhereInput
    isNot?: TranslationWhereInput
  }

  export type TranslationHistoryCountOrderByAggregateInput = {
    id?: SortOrder
    translationId?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    commitSha?: SortOrder
    createdAt?: SortOrder
  }

  export type TranslationHistoryMaxOrderByAggregateInput = {
    id?: SortOrder
    translationId?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    commitSha?: SortOrder
    createdAt?: SortOrder
  }

  export type TranslationHistoryMinOrderByAggregateInput = {
    id?: SortOrder
    translationId?: SortOrder
    projectId?: SortOrder
    language?: SortOrder
    key?: SortOrder
    value?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    commitSha?: SortOrder
    createdAt?: SortOrder
  }

  export type ProjectCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    repository?: SortOrder
    accessControl?: SortOrder
    sourceLanguage?: SortOrder
    createdAt?: SortOrder
  }

  export type ProjectMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    repository?: SortOrder
    accessControl?: SortOrder
    sourceLanguage?: SortOrder
    createdAt?: SortOrder
  }

  export type ProjectMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    repository?: SortOrder
    accessControl?: SortOrder
    sourceLanguage?: SortOrder
    createdAt?: SortOrder
  }

  export type ProjectScalarRelationFilter = {
    is?: ProjectWhereInput
    isNot?: ProjectWhereInput
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type ProjectMemberProjectIdUserIdCompoundUniqueInput = {
    projectId: string
    userId: string
  }

  export type ProjectMemberCountOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    role?: SortOrder
    addedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProjectMemberMaxOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    role?: SortOrder
    addedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProjectMemberMinOrderByAggregateInput = {
    id?: SortOrder
    projectId?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    role?: SortOrder
    addedBy?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProjectCreateNestedManyWithoutUserInput = {
    create?: XOR<ProjectCreateWithoutUserInput, ProjectUncheckedCreateWithoutUserInput> | ProjectCreateWithoutUserInput[] | ProjectUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectCreateOrConnectWithoutUserInput | ProjectCreateOrConnectWithoutUserInput[]
    createMany?: ProjectCreateManyUserInputEnvelope
    connect?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
  }

  export type TranslationCreateNestedManyWithoutUserInput = {
    create?: XOR<TranslationCreateWithoutUserInput, TranslationUncheckedCreateWithoutUserInput> | TranslationCreateWithoutUserInput[] | TranslationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationCreateOrConnectWithoutUserInput | TranslationCreateOrConnectWithoutUserInput[]
    createMany?: TranslationCreateManyUserInputEnvelope
    connect?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
  }

  export type TranslationHistoryCreateNestedManyWithoutUserInput = {
    create?: XOR<TranslationHistoryCreateWithoutUserInput, TranslationHistoryUncheckedCreateWithoutUserInput> | TranslationHistoryCreateWithoutUserInput[] | TranslationHistoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutUserInput | TranslationHistoryCreateOrConnectWithoutUserInput[]
    createMany?: TranslationHistoryCreateManyUserInputEnvelope
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
  }

  export type ProjectMemberCreateNestedManyWithoutUserInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type ProjectMemberCreateNestedManyWithoutAddedByUserInput = {
    create?: XOR<ProjectMemberCreateWithoutAddedByUserInput, ProjectMemberUncheckedCreateWithoutAddedByUserInput> | ProjectMemberCreateWithoutAddedByUserInput[] | ProjectMemberUncheckedCreateWithoutAddedByUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutAddedByUserInput | ProjectMemberCreateOrConnectWithoutAddedByUserInput[]
    createMany?: ProjectMemberCreateManyAddedByUserInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type ProjectUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ProjectCreateWithoutUserInput, ProjectUncheckedCreateWithoutUserInput> | ProjectCreateWithoutUserInput[] | ProjectUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectCreateOrConnectWithoutUserInput | ProjectCreateOrConnectWithoutUserInput[]
    createMany?: ProjectCreateManyUserInputEnvelope
    connect?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
  }

  export type TranslationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TranslationCreateWithoutUserInput, TranslationUncheckedCreateWithoutUserInput> | TranslationCreateWithoutUserInput[] | TranslationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationCreateOrConnectWithoutUserInput | TranslationCreateOrConnectWithoutUserInput[]
    createMany?: TranslationCreateManyUserInputEnvelope
    connect?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
  }

  export type TranslationHistoryUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<TranslationHistoryCreateWithoutUserInput, TranslationHistoryUncheckedCreateWithoutUserInput> | TranslationHistoryCreateWithoutUserInput[] | TranslationHistoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutUserInput | TranslationHistoryCreateOrConnectWithoutUserInput[]
    createMany?: TranslationHistoryCreateManyUserInputEnvelope
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
  }

  export type ProjectMemberUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type ProjectMemberUncheckedCreateNestedManyWithoutAddedByUserInput = {
    create?: XOR<ProjectMemberCreateWithoutAddedByUserInput, ProjectMemberUncheckedCreateWithoutAddedByUserInput> | ProjectMemberCreateWithoutAddedByUserInput[] | ProjectMemberUncheckedCreateWithoutAddedByUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutAddedByUserInput | ProjectMemberCreateOrConnectWithoutAddedByUserInput[]
    createMany?: ProjectMemberCreateManyAddedByUserInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ProjectUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProjectCreateWithoutUserInput, ProjectUncheckedCreateWithoutUserInput> | ProjectCreateWithoutUserInput[] | ProjectUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectCreateOrConnectWithoutUserInput | ProjectCreateOrConnectWithoutUserInput[]
    upsert?: ProjectUpsertWithWhereUniqueWithoutUserInput | ProjectUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProjectCreateManyUserInputEnvelope
    set?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    disconnect?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    delete?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    connect?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    update?: ProjectUpdateWithWhereUniqueWithoutUserInput | ProjectUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProjectUpdateManyWithWhereWithoutUserInput | ProjectUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProjectScalarWhereInput | ProjectScalarWhereInput[]
  }

  export type TranslationUpdateManyWithoutUserNestedInput = {
    create?: XOR<TranslationCreateWithoutUserInput, TranslationUncheckedCreateWithoutUserInput> | TranslationCreateWithoutUserInput[] | TranslationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationCreateOrConnectWithoutUserInput | TranslationCreateOrConnectWithoutUserInput[]
    upsert?: TranslationUpsertWithWhereUniqueWithoutUserInput | TranslationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TranslationCreateManyUserInputEnvelope
    set?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    disconnect?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    delete?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    connect?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    update?: TranslationUpdateWithWhereUniqueWithoutUserInput | TranslationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TranslationUpdateManyWithWhereWithoutUserInput | TranslationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TranslationScalarWhereInput | TranslationScalarWhereInput[]
  }

  export type TranslationHistoryUpdateManyWithoutUserNestedInput = {
    create?: XOR<TranslationHistoryCreateWithoutUserInput, TranslationHistoryUncheckedCreateWithoutUserInput> | TranslationHistoryCreateWithoutUserInput[] | TranslationHistoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutUserInput | TranslationHistoryCreateOrConnectWithoutUserInput[]
    upsert?: TranslationHistoryUpsertWithWhereUniqueWithoutUserInput | TranslationHistoryUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TranslationHistoryCreateManyUserInputEnvelope
    set?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    disconnect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    delete?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    update?: TranslationHistoryUpdateWithWhereUniqueWithoutUserInput | TranslationHistoryUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TranslationHistoryUpdateManyWithWhereWithoutUserInput | TranslationHistoryUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TranslationHistoryScalarWhereInput | TranslationHistoryScalarWhereInput[]
  }

  export type ProjectMemberUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutUserInput | ProjectMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutUserInput | ProjectMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutUserInput | ProjectMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type ProjectMemberUpdateManyWithoutAddedByUserNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutAddedByUserInput, ProjectMemberUncheckedCreateWithoutAddedByUserInput> | ProjectMemberCreateWithoutAddedByUserInput[] | ProjectMemberUncheckedCreateWithoutAddedByUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutAddedByUserInput | ProjectMemberCreateOrConnectWithoutAddedByUserInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutAddedByUserInput | ProjectMemberUpsertWithWhereUniqueWithoutAddedByUserInput[]
    createMany?: ProjectMemberCreateManyAddedByUserInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutAddedByUserInput | ProjectMemberUpdateWithWhereUniqueWithoutAddedByUserInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutAddedByUserInput | ProjectMemberUpdateManyWithWhereWithoutAddedByUserInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type ProjectUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProjectCreateWithoutUserInput, ProjectUncheckedCreateWithoutUserInput> | ProjectCreateWithoutUserInput[] | ProjectUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectCreateOrConnectWithoutUserInput | ProjectCreateOrConnectWithoutUserInput[]
    upsert?: ProjectUpsertWithWhereUniqueWithoutUserInput | ProjectUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProjectCreateManyUserInputEnvelope
    set?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    disconnect?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    delete?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    connect?: ProjectWhereUniqueInput | ProjectWhereUniqueInput[]
    update?: ProjectUpdateWithWhereUniqueWithoutUserInput | ProjectUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProjectUpdateManyWithWhereWithoutUserInput | ProjectUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProjectScalarWhereInput | ProjectScalarWhereInput[]
  }

  export type TranslationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TranslationCreateWithoutUserInput, TranslationUncheckedCreateWithoutUserInput> | TranslationCreateWithoutUserInput[] | TranslationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationCreateOrConnectWithoutUserInput | TranslationCreateOrConnectWithoutUserInput[]
    upsert?: TranslationUpsertWithWhereUniqueWithoutUserInput | TranslationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TranslationCreateManyUserInputEnvelope
    set?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    disconnect?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    delete?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    connect?: TranslationWhereUniqueInput | TranslationWhereUniqueInput[]
    update?: TranslationUpdateWithWhereUniqueWithoutUserInput | TranslationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TranslationUpdateManyWithWhereWithoutUserInput | TranslationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TranslationScalarWhereInput | TranslationScalarWhereInput[]
  }

  export type TranslationHistoryUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<TranslationHistoryCreateWithoutUserInput, TranslationHistoryUncheckedCreateWithoutUserInput> | TranslationHistoryCreateWithoutUserInput[] | TranslationHistoryUncheckedCreateWithoutUserInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutUserInput | TranslationHistoryCreateOrConnectWithoutUserInput[]
    upsert?: TranslationHistoryUpsertWithWhereUniqueWithoutUserInput | TranslationHistoryUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: TranslationHistoryCreateManyUserInputEnvelope
    set?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    disconnect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    delete?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    update?: TranslationHistoryUpdateWithWhereUniqueWithoutUserInput | TranslationHistoryUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: TranslationHistoryUpdateManyWithWhereWithoutUserInput | TranslationHistoryUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: TranslationHistoryScalarWhereInput | TranslationHistoryScalarWhereInput[]
  }

  export type ProjectMemberUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput> | ProjectMemberCreateWithoutUserInput[] | ProjectMemberUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutUserInput | ProjectMemberCreateOrConnectWithoutUserInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutUserInput | ProjectMemberUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProjectMemberCreateManyUserInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutUserInput | ProjectMemberUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutUserInput | ProjectMemberUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type ProjectMemberUncheckedUpdateManyWithoutAddedByUserNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutAddedByUserInput, ProjectMemberUncheckedCreateWithoutAddedByUserInput> | ProjectMemberCreateWithoutAddedByUserInput[] | ProjectMemberUncheckedCreateWithoutAddedByUserInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutAddedByUserInput | ProjectMemberCreateOrConnectWithoutAddedByUserInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutAddedByUserInput | ProjectMemberUpsertWithWhereUniqueWithoutAddedByUserInput[]
    createMany?: ProjectMemberCreateManyAddedByUserInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutAddedByUserInput | ProjectMemberUpdateWithWhereUniqueWithoutAddedByUserInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutAddedByUserInput | ProjectMemberUpdateManyWithWhereWithoutAddedByUserInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutTranslationsInput = {
    create?: XOR<UserCreateWithoutTranslationsInput, UserUncheckedCreateWithoutTranslationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTranslationsInput
    connect?: UserWhereUniqueInput
  }

  export type TranslationHistoryCreateNestedManyWithoutTranslationInput = {
    create?: XOR<TranslationHistoryCreateWithoutTranslationInput, TranslationHistoryUncheckedCreateWithoutTranslationInput> | TranslationHistoryCreateWithoutTranslationInput[] | TranslationHistoryUncheckedCreateWithoutTranslationInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutTranslationInput | TranslationHistoryCreateOrConnectWithoutTranslationInput[]
    createMany?: TranslationHistoryCreateManyTranslationInputEnvelope
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
  }

  export type TranslationHistoryUncheckedCreateNestedManyWithoutTranslationInput = {
    create?: XOR<TranslationHistoryCreateWithoutTranslationInput, TranslationHistoryUncheckedCreateWithoutTranslationInput> | TranslationHistoryCreateWithoutTranslationInput[] | TranslationHistoryUncheckedCreateWithoutTranslationInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutTranslationInput | TranslationHistoryCreateOrConnectWithoutTranslationInput[]
    createMany?: TranslationHistoryCreateManyTranslationInputEnvelope
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutTranslationsNestedInput = {
    create?: XOR<UserCreateWithoutTranslationsInput, UserUncheckedCreateWithoutTranslationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTranslationsInput
    upsert?: UserUpsertWithoutTranslationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTranslationsInput, UserUpdateWithoutTranslationsInput>, UserUncheckedUpdateWithoutTranslationsInput>
  }

  export type TranslationHistoryUpdateManyWithoutTranslationNestedInput = {
    create?: XOR<TranslationHistoryCreateWithoutTranslationInput, TranslationHistoryUncheckedCreateWithoutTranslationInput> | TranslationHistoryCreateWithoutTranslationInput[] | TranslationHistoryUncheckedCreateWithoutTranslationInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutTranslationInput | TranslationHistoryCreateOrConnectWithoutTranslationInput[]
    upsert?: TranslationHistoryUpsertWithWhereUniqueWithoutTranslationInput | TranslationHistoryUpsertWithWhereUniqueWithoutTranslationInput[]
    createMany?: TranslationHistoryCreateManyTranslationInputEnvelope
    set?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    disconnect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    delete?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    update?: TranslationHistoryUpdateWithWhereUniqueWithoutTranslationInput | TranslationHistoryUpdateWithWhereUniqueWithoutTranslationInput[]
    updateMany?: TranslationHistoryUpdateManyWithWhereWithoutTranslationInput | TranslationHistoryUpdateManyWithWhereWithoutTranslationInput[]
    deleteMany?: TranslationHistoryScalarWhereInput | TranslationHistoryScalarWhereInput[]
  }

  export type TranslationHistoryUncheckedUpdateManyWithoutTranslationNestedInput = {
    create?: XOR<TranslationHistoryCreateWithoutTranslationInput, TranslationHistoryUncheckedCreateWithoutTranslationInput> | TranslationHistoryCreateWithoutTranslationInput[] | TranslationHistoryUncheckedCreateWithoutTranslationInput[]
    connectOrCreate?: TranslationHistoryCreateOrConnectWithoutTranslationInput | TranslationHistoryCreateOrConnectWithoutTranslationInput[]
    upsert?: TranslationHistoryUpsertWithWhereUniqueWithoutTranslationInput | TranslationHistoryUpsertWithWhereUniqueWithoutTranslationInput[]
    createMany?: TranslationHistoryCreateManyTranslationInputEnvelope
    set?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    disconnect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    delete?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    connect?: TranslationHistoryWhereUniqueInput | TranslationHistoryWhereUniqueInput[]
    update?: TranslationHistoryUpdateWithWhereUniqueWithoutTranslationInput | TranslationHistoryUpdateWithWhereUniqueWithoutTranslationInput[]
    updateMany?: TranslationHistoryUpdateManyWithWhereWithoutTranslationInput | TranslationHistoryUpdateManyWithWhereWithoutTranslationInput[]
    deleteMany?: TranslationHistoryScalarWhereInput | TranslationHistoryScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutTranslationHistoryInput = {
    create?: XOR<UserCreateWithoutTranslationHistoryInput, UserUncheckedCreateWithoutTranslationHistoryInput>
    connectOrCreate?: UserCreateOrConnectWithoutTranslationHistoryInput
    connect?: UserWhereUniqueInput
  }

  export type TranslationCreateNestedOneWithoutHistoryInput = {
    create?: XOR<TranslationCreateWithoutHistoryInput, TranslationUncheckedCreateWithoutHistoryInput>
    connectOrCreate?: TranslationCreateOrConnectWithoutHistoryInput
    connect?: TranslationWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutTranslationHistoryNestedInput = {
    create?: XOR<UserCreateWithoutTranslationHistoryInput, UserUncheckedCreateWithoutTranslationHistoryInput>
    connectOrCreate?: UserCreateOrConnectWithoutTranslationHistoryInput
    upsert?: UserUpsertWithoutTranslationHistoryInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTranslationHistoryInput, UserUpdateWithoutTranslationHistoryInput>, UserUncheckedUpdateWithoutTranslationHistoryInput>
  }

  export type TranslationUpdateOneRequiredWithoutHistoryNestedInput = {
    create?: XOR<TranslationCreateWithoutHistoryInput, TranslationUncheckedCreateWithoutHistoryInput>
    connectOrCreate?: TranslationCreateOrConnectWithoutHistoryInput
    upsert?: TranslationUpsertWithoutHistoryInput
    connect?: TranslationWhereUniqueInput
    update?: XOR<XOR<TranslationUpdateToOneWithWhereWithoutHistoryInput, TranslationUpdateWithoutHistoryInput>, TranslationUncheckedUpdateWithoutHistoryInput>
  }

  export type UserCreateNestedOneWithoutProjectsInput = {
    create?: XOR<UserCreateWithoutProjectsInput, UserUncheckedCreateWithoutProjectsInput>
    connectOrCreate?: UserCreateOrConnectWithoutProjectsInput
    connect?: UserWhereUniqueInput
  }

  export type ProjectMemberCreateNestedManyWithoutProjectInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type ProjectMemberUncheckedCreateNestedManyWithoutProjectInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutProjectsNestedInput = {
    create?: XOR<UserCreateWithoutProjectsInput, UserUncheckedCreateWithoutProjectsInput>
    connectOrCreate?: UserCreateOrConnectWithoutProjectsInput
    upsert?: UserUpsertWithoutProjectsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutProjectsInput, UserUpdateWithoutProjectsInput>, UserUncheckedUpdateWithoutProjectsInput>
  }

  export type ProjectMemberUpdateManyWithoutProjectNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutProjectInput | ProjectMemberUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutProjectInput | ProjectMemberUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutProjectInput | ProjectMemberUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput = {
    create?: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput> | ProjectMemberCreateWithoutProjectInput[] | ProjectMemberUncheckedCreateWithoutProjectInput[]
    connectOrCreate?: ProjectMemberCreateOrConnectWithoutProjectInput | ProjectMemberCreateOrConnectWithoutProjectInput[]
    upsert?: ProjectMemberUpsertWithWhereUniqueWithoutProjectInput | ProjectMemberUpsertWithWhereUniqueWithoutProjectInput[]
    createMany?: ProjectMemberCreateManyProjectInputEnvelope
    set?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    disconnect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    delete?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    connect?: ProjectMemberWhereUniqueInput | ProjectMemberWhereUniqueInput[]
    update?: ProjectMemberUpdateWithWhereUniqueWithoutProjectInput | ProjectMemberUpdateWithWhereUniqueWithoutProjectInput[]
    updateMany?: ProjectMemberUpdateManyWithWhereWithoutProjectInput | ProjectMemberUpdateManyWithWhereWithoutProjectInput[]
    deleteMany?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
  }

  export type ProjectCreateNestedOneWithoutMembersInput = {
    create?: XOR<ProjectCreateWithoutMembersInput, ProjectUncheckedCreateWithoutMembersInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutMembersInput
    connect?: ProjectWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutProjectMembershipsInput = {
    create?: XOR<UserCreateWithoutProjectMembershipsInput, UserUncheckedCreateWithoutProjectMembershipsInput>
    connectOrCreate?: UserCreateOrConnectWithoutProjectMembershipsInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutAddedMembersInput = {
    create?: XOR<UserCreateWithoutAddedMembersInput, UserUncheckedCreateWithoutAddedMembersInput>
    connectOrCreate?: UserCreateOrConnectWithoutAddedMembersInput
    connect?: UserWhereUniqueInput
  }

  export type ProjectUpdateOneRequiredWithoutMembersNestedInput = {
    create?: XOR<ProjectCreateWithoutMembersInput, ProjectUncheckedCreateWithoutMembersInput>
    connectOrCreate?: ProjectCreateOrConnectWithoutMembersInput
    upsert?: ProjectUpsertWithoutMembersInput
    connect?: ProjectWhereUniqueInput
    update?: XOR<XOR<ProjectUpdateToOneWithWhereWithoutMembersInput, ProjectUpdateWithoutMembersInput>, ProjectUncheckedUpdateWithoutMembersInput>
  }

  export type UserUpdateOneRequiredWithoutProjectMembershipsNestedInput = {
    create?: XOR<UserCreateWithoutProjectMembershipsInput, UserUncheckedCreateWithoutProjectMembershipsInput>
    connectOrCreate?: UserCreateOrConnectWithoutProjectMembershipsInput
    upsert?: UserUpsertWithoutProjectMembershipsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutProjectMembershipsInput, UserUpdateWithoutProjectMembershipsInput>, UserUncheckedUpdateWithoutProjectMembershipsInput>
  }

  export type UserUpdateOneWithoutAddedMembersNestedInput = {
    create?: XOR<UserCreateWithoutAddedMembersInput, UserUncheckedCreateWithoutAddedMembersInput>
    connectOrCreate?: UserCreateOrConnectWithoutAddedMembersInput
    upsert?: UserUpsertWithoutAddedMembersInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAddedMembersInput, UserUpdateWithoutAddedMembersInput>, UserUncheckedUpdateWithoutAddedMembersInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type ProjectCreateWithoutUserInput = {
    id: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
    members?: ProjectMemberCreateNestedManyWithoutProjectInput
  }

  export type ProjectUncheckedCreateWithoutUserInput = {
    id: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
    members?: ProjectMemberUncheckedCreateNestedManyWithoutProjectInput
  }

  export type ProjectCreateOrConnectWithoutUserInput = {
    where: ProjectWhereUniqueInput
    create: XOR<ProjectCreateWithoutUserInput, ProjectUncheckedCreateWithoutUserInput>
  }

  export type ProjectCreateManyUserInputEnvelope = {
    data: ProjectCreateManyUserInput | ProjectCreateManyUserInput[]
  }

  export type TranslationCreateWithoutUserInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TranslationHistoryCreateNestedManyWithoutTranslationInput
  }

  export type TranslationUncheckedCreateWithoutUserInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    history?: TranslationHistoryUncheckedCreateNestedManyWithoutTranslationInput
  }

  export type TranslationCreateOrConnectWithoutUserInput = {
    where: TranslationWhereUniqueInput
    create: XOR<TranslationCreateWithoutUserInput, TranslationUncheckedCreateWithoutUserInput>
  }

  export type TranslationCreateManyUserInputEnvelope = {
    data: TranslationCreateManyUserInput | TranslationCreateManyUserInput[]
  }

  export type TranslationHistoryCreateWithoutUserInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
    translation: TranslationCreateNestedOneWithoutHistoryInput
  }

  export type TranslationHistoryUncheckedCreateWithoutUserInput = {
    id: string
    translationId: string
    projectId: string
    language: string
    key: string
    value: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
  }

  export type TranslationHistoryCreateOrConnectWithoutUserInput = {
    where: TranslationHistoryWhereUniqueInput
    create: XOR<TranslationHistoryCreateWithoutUserInput, TranslationHistoryUncheckedCreateWithoutUserInput>
  }

  export type TranslationHistoryCreateManyUserInputEnvelope = {
    data: TranslationHistoryCreateManyUserInput | TranslationHistoryCreateManyUserInput[]
  }

  export type ProjectMemberCreateWithoutUserInput = {
    id: string
    status?: string
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    project: ProjectCreateNestedOneWithoutMembersInput
    addedByUser?: UserCreateNestedOneWithoutAddedMembersInput
  }

  export type ProjectMemberUncheckedCreateWithoutUserInput = {
    id: string
    projectId: string
    status?: string
    role?: string
    addedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberCreateOrConnectWithoutUserInput = {
    where: ProjectMemberWhereUniqueInput
    create: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput>
  }

  export type ProjectMemberCreateManyUserInputEnvelope = {
    data: ProjectMemberCreateManyUserInput | ProjectMemberCreateManyUserInput[]
  }

  export type ProjectMemberCreateWithoutAddedByUserInput = {
    id: string
    status?: string
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    project: ProjectCreateNestedOneWithoutMembersInput
    user: UserCreateNestedOneWithoutProjectMembershipsInput
  }

  export type ProjectMemberUncheckedCreateWithoutAddedByUserInput = {
    id: string
    projectId: string
    userId: string
    status?: string
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberCreateOrConnectWithoutAddedByUserInput = {
    where: ProjectMemberWhereUniqueInput
    create: XOR<ProjectMemberCreateWithoutAddedByUserInput, ProjectMemberUncheckedCreateWithoutAddedByUserInput>
  }

  export type ProjectMemberCreateManyAddedByUserInputEnvelope = {
    data: ProjectMemberCreateManyAddedByUserInput | ProjectMemberCreateManyAddedByUserInput[]
  }

  export type ProjectUpsertWithWhereUniqueWithoutUserInput = {
    where: ProjectWhereUniqueInput
    update: XOR<ProjectUpdateWithoutUserInput, ProjectUncheckedUpdateWithoutUserInput>
    create: XOR<ProjectCreateWithoutUserInput, ProjectUncheckedCreateWithoutUserInput>
  }

  export type ProjectUpdateWithWhereUniqueWithoutUserInput = {
    where: ProjectWhereUniqueInput
    data: XOR<ProjectUpdateWithoutUserInput, ProjectUncheckedUpdateWithoutUserInput>
  }

  export type ProjectUpdateManyWithWhereWithoutUserInput = {
    where: ProjectScalarWhereInput
    data: XOR<ProjectUpdateManyMutationInput, ProjectUncheckedUpdateManyWithoutUserInput>
  }

  export type ProjectScalarWhereInput = {
    AND?: ProjectScalarWhereInput | ProjectScalarWhereInput[]
    OR?: ProjectScalarWhereInput[]
    NOT?: ProjectScalarWhereInput | ProjectScalarWhereInput[]
    id?: StringFilter<"Project"> | string
    userId?: StringFilter<"Project"> | string
    name?: StringFilter<"Project"> | string
    repository?: StringFilter<"Project"> | string
    accessControl?: StringFilter<"Project"> | string
    sourceLanguage?: StringFilter<"Project"> | string
    createdAt?: DateTimeFilter<"Project"> | Date | string
  }

  export type TranslationUpsertWithWhereUniqueWithoutUserInput = {
    where: TranslationWhereUniqueInput
    update: XOR<TranslationUpdateWithoutUserInput, TranslationUncheckedUpdateWithoutUserInput>
    create: XOR<TranslationCreateWithoutUserInput, TranslationUncheckedCreateWithoutUserInput>
  }

  export type TranslationUpdateWithWhereUniqueWithoutUserInput = {
    where: TranslationWhereUniqueInput
    data: XOR<TranslationUpdateWithoutUserInput, TranslationUncheckedUpdateWithoutUserInput>
  }

  export type TranslationUpdateManyWithWhereWithoutUserInput = {
    where: TranslationScalarWhereInput
    data: XOR<TranslationUpdateManyMutationInput, TranslationUncheckedUpdateManyWithoutUserInput>
  }

  export type TranslationScalarWhereInput = {
    AND?: TranslationScalarWhereInput | TranslationScalarWhereInput[]
    OR?: TranslationScalarWhereInput[]
    NOT?: TranslationScalarWhereInput | TranslationScalarWhereInput[]
    id?: StringFilter<"Translation"> | string
    projectId?: StringFilter<"Translation"> | string
    language?: StringFilter<"Translation"> | string
    key?: StringFilter<"Translation"> | string
    value?: StringFilter<"Translation"> | string
    userId?: StringFilter<"Translation"> | string
    status?: StringFilter<"Translation"> | string
    commitSha?: StringNullableFilter<"Translation"> | string | null
    createdAt?: DateTimeFilter<"Translation"> | Date | string
    updatedAt?: DateTimeFilter<"Translation"> | Date | string
  }

  export type TranslationHistoryUpsertWithWhereUniqueWithoutUserInput = {
    where: TranslationHistoryWhereUniqueInput
    update: XOR<TranslationHistoryUpdateWithoutUserInput, TranslationHistoryUncheckedUpdateWithoutUserInput>
    create: XOR<TranslationHistoryCreateWithoutUserInput, TranslationHistoryUncheckedCreateWithoutUserInput>
  }

  export type TranslationHistoryUpdateWithWhereUniqueWithoutUserInput = {
    where: TranslationHistoryWhereUniqueInput
    data: XOR<TranslationHistoryUpdateWithoutUserInput, TranslationHistoryUncheckedUpdateWithoutUserInput>
  }

  export type TranslationHistoryUpdateManyWithWhereWithoutUserInput = {
    where: TranslationHistoryScalarWhereInput
    data: XOR<TranslationHistoryUpdateManyMutationInput, TranslationHistoryUncheckedUpdateManyWithoutUserInput>
  }

  export type TranslationHistoryScalarWhereInput = {
    AND?: TranslationHistoryScalarWhereInput | TranslationHistoryScalarWhereInput[]
    OR?: TranslationHistoryScalarWhereInput[]
    NOT?: TranslationHistoryScalarWhereInput | TranslationHistoryScalarWhereInput[]
    id?: StringFilter<"TranslationHistory"> | string
    translationId?: StringFilter<"TranslationHistory"> | string
    projectId?: StringFilter<"TranslationHistory"> | string
    language?: StringFilter<"TranslationHistory"> | string
    key?: StringFilter<"TranslationHistory"> | string
    value?: StringFilter<"TranslationHistory"> | string
    userId?: StringFilter<"TranslationHistory"> | string
    action?: StringFilter<"TranslationHistory"> | string
    commitSha?: StringNullableFilter<"TranslationHistory"> | string | null
    createdAt?: DateTimeFilter<"TranslationHistory"> | Date | string
  }

  export type ProjectMemberUpsertWithWhereUniqueWithoutUserInput = {
    where: ProjectMemberWhereUniqueInput
    update: XOR<ProjectMemberUpdateWithoutUserInput, ProjectMemberUncheckedUpdateWithoutUserInput>
    create: XOR<ProjectMemberCreateWithoutUserInput, ProjectMemberUncheckedCreateWithoutUserInput>
  }

  export type ProjectMemberUpdateWithWhereUniqueWithoutUserInput = {
    where: ProjectMemberWhereUniqueInput
    data: XOR<ProjectMemberUpdateWithoutUserInput, ProjectMemberUncheckedUpdateWithoutUserInput>
  }

  export type ProjectMemberUpdateManyWithWhereWithoutUserInput = {
    where: ProjectMemberScalarWhereInput
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyWithoutUserInput>
  }

  export type ProjectMemberScalarWhereInput = {
    AND?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
    OR?: ProjectMemberScalarWhereInput[]
    NOT?: ProjectMemberScalarWhereInput | ProjectMemberScalarWhereInput[]
    id?: StringFilter<"ProjectMember"> | string
    projectId?: StringFilter<"ProjectMember"> | string
    userId?: StringFilter<"ProjectMember"> | string
    status?: StringFilter<"ProjectMember"> | string
    role?: StringFilter<"ProjectMember"> | string
    addedBy?: StringNullableFilter<"ProjectMember"> | string | null
    createdAt?: DateTimeFilter<"ProjectMember"> | Date | string
    updatedAt?: DateTimeFilter<"ProjectMember"> | Date | string
  }

  export type ProjectMemberUpsertWithWhereUniqueWithoutAddedByUserInput = {
    where: ProjectMemberWhereUniqueInput
    update: XOR<ProjectMemberUpdateWithoutAddedByUserInput, ProjectMemberUncheckedUpdateWithoutAddedByUserInput>
    create: XOR<ProjectMemberCreateWithoutAddedByUserInput, ProjectMemberUncheckedCreateWithoutAddedByUserInput>
  }

  export type ProjectMemberUpdateWithWhereUniqueWithoutAddedByUserInput = {
    where: ProjectMemberWhereUniqueInput
    data: XOR<ProjectMemberUpdateWithoutAddedByUserInput, ProjectMemberUncheckedUpdateWithoutAddedByUserInput>
  }

  export type ProjectMemberUpdateManyWithWhereWithoutAddedByUserInput = {
    where: ProjectMemberScalarWhereInput
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyWithoutAddedByUserInput>
  }

  export type UserCreateWithoutTranslationsInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberCreateNestedManyWithoutAddedByUserInput
  }

  export type UserUncheckedCreateWithoutTranslationsInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectUncheckedCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryUncheckedCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberUncheckedCreateNestedManyWithoutAddedByUserInput
  }

  export type UserCreateOrConnectWithoutTranslationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTranslationsInput, UserUncheckedCreateWithoutTranslationsInput>
  }

  export type TranslationHistoryCreateWithoutTranslationInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutTranslationHistoryInput
  }

  export type TranslationHistoryUncheckedCreateWithoutTranslationInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
  }

  export type TranslationHistoryCreateOrConnectWithoutTranslationInput = {
    where: TranslationHistoryWhereUniqueInput
    create: XOR<TranslationHistoryCreateWithoutTranslationInput, TranslationHistoryUncheckedCreateWithoutTranslationInput>
  }

  export type TranslationHistoryCreateManyTranslationInputEnvelope = {
    data: TranslationHistoryCreateManyTranslationInput | TranslationHistoryCreateManyTranslationInput[]
  }

  export type UserUpsertWithoutTranslationsInput = {
    update: XOR<UserUpdateWithoutTranslationsInput, UserUncheckedUpdateWithoutTranslationsInput>
    create: XOR<UserCreateWithoutTranslationsInput, UserUncheckedCreateWithoutTranslationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTranslationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTranslationsInput, UserUncheckedUpdateWithoutTranslationsInput>
  }

  export type UserUpdateWithoutTranslationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTranslationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUncheckedUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUncheckedUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUncheckedUpdateManyWithoutAddedByUserNestedInput
  }

  export type TranslationHistoryUpsertWithWhereUniqueWithoutTranslationInput = {
    where: TranslationHistoryWhereUniqueInput
    update: XOR<TranslationHistoryUpdateWithoutTranslationInput, TranslationHistoryUncheckedUpdateWithoutTranslationInput>
    create: XOR<TranslationHistoryCreateWithoutTranslationInput, TranslationHistoryUncheckedCreateWithoutTranslationInput>
  }

  export type TranslationHistoryUpdateWithWhereUniqueWithoutTranslationInput = {
    where: TranslationHistoryWhereUniqueInput
    data: XOR<TranslationHistoryUpdateWithoutTranslationInput, TranslationHistoryUncheckedUpdateWithoutTranslationInput>
  }

  export type TranslationHistoryUpdateManyWithWhereWithoutTranslationInput = {
    where: TranslationHistoryScalarWhereInput
    data: XOR<TranslationHistoryUpdateManyMutationInput, TranslationHistoryUncheckedUpdateManyWithoutTranslationInput>
  }

  export type UserCreateWithoutTranslationHistoryInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectCreateNestedManyWithoutUserInput
    translations?: TranslationCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberCreateNestedManyWithoutAddedByUserInput
  }

  export type UserUncheckedCreateWithoutTranslationHistoryInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectUncheckedCreateNestedManyWithoutUserInput
    translations?: TranslationUncheckedCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberUncheckedCreateNestedManyWithoutAddedByUserInput
  }

  export type UserCreateOrConnectWithoutTranslationHistoryInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTranslationHistoryInput, UserUncheckedCreateWithoutTranslationHistoryInput>
  }

  export type TranslationCreateWithoutHistoryInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutTranslationsInput
  }

  export type TranslationUncheckedCreateWithoutHistoryInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TranslationCreateOrConnectWithoutHistoryInput = {
    where: TranslationWhereUniqueInput
    create: XOR<TranslationCreateWithoutHistoryInput, TranslationUncheckedCreateWithoutHistoryInput>
  }

  export type UserUpsertWithoutTranslationHistoryInput = {
    update: XOR<UserUpdateWithoutTranslationHistoryInput, UserUncheckedUpdateWithoutTranslationHistoryInput>
    create: XOR<UserCreateWithoutTranslationHistoryInput, UserUncheckedCreateWithoutTranslationHistoryInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTranslationHistoryInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTranslationHistoryInput, UserUncheckedUpdateWithoutTranslationHistoryInput>
  }

  export type UserUpdateWithoutTranslationHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUpdateManyWithoutUserNestedInput
    translations?: TranslationUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserUncheckedUpdateWithoutTranslationHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUncheckedUpdateManyWithoutUserNestedInput
    translations?: TranslationUncheckedUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUncheckedUpdateManyWithoutAddedByUserNestedInput
  }

  export type TranslationUpsertWithoutHistoryInput = {
    update: XOR<TranslationUpdateWithoutHistoryInput, TranslationUncheckedUpdateWithoutHistoryInput>
    create: XOR<TranslationCreateWithoutHistoryInput, TranslationUncheckedCreateWithoutHistoryInput>
    where?: TranslationWhereInput
  }

  export type TranslationUpdateToOneWithWhereWithoutHistoryInput = {
    where?: TranslationWhereInput
    data: XOR<TranslationUpdateWithoutHistoryInput, TranslationUncheckedUpdateWithoutHistoryInput>
  }

  export type TranslationUpdateWithoutHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTranslationsNestedInput
  }

  export type TranslationUncheckedUpdateWithoutHistoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateWithoutProjectsInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    translations?: TranslationCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberCreateNestedManyWithoutAddedByUserInput
  }

  export type UserUncheckedCreateWithoutProjectsInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    translations?: TranslationUncheckedCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryUncheckedCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberUncheckedCreateNestedManyWithoutAddedByUserInput
  }

  export type UserCreateOrConnectWithoutProjectsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutProjectsInput, UserUncheckedCreateWithoutProjectsInput>
  }

  export type ProjectMemberCreateWithoutProjectInput = {
    id: string
    status?: string
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutProjectMembershipsInput
    addedByUser?: UserCreateNestedOneWithoutAddedMembersInput
  }

  export type ProjectMemberUncheckedCreateWithoutProjectInput = {
    id: string
    userId: string
    status?: string
    role?: string
    addedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberCreateOrConnectWithoutProjectInput = {
    where: ProjectMemberWhereUniqueInput
    create: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput>
  }

  export type ProjectMemberCreateManyProjectInputEnvelope = {
    data: ProjectMemberCreateManyProjectInput | ProjectMemberCreateManyProjectInput[]
  }

  export type UserUpsertWithoutProjectsInput = {
    update: XOR<UserUpdateWithoutProjectsInput, UserUncheckedUpdateWithoutProjectsInput>
    create: XOR<UserCreateWithoutProjectsInput, UserUncheckedCreateWithoutProjectsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutProjectsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutProjectsInput, UserUncheckedUpdateWithoutProjectsInput>
  }

  export type UserUpdateWithoutProjectsInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    translations?: TranslationUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserUncheckedUpdateWithoutProjectsInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    translations?: TranslationUncheckedUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUncheckedUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUncheckedUpdateManyWithoutAddedByUserNestedInput
  }

  export type ProjectMemberUpsertWithWhereUniqueWithoutProjectInput = {
    where: ProjectMemberWhereUniqueInput
    update: XOR<ProjectMemberUpdateWithoutProjectInput, ProjectMemberUncheckedUpdateWithoutProjectInput>
    create: XOR<ProjectMemberCreateWithoutProjectInput, ProjectMemberUncheckedCreateWithoutProjectInput>
  }

  export type ProjectMemberUpdateWithWhereUniqueWithoutProjectInput = {
    where: ProjectMemberWhereUniqueInput
    data: XOR<ProjectMemberUpdateWithoutProjectInput, ProjectMemberUncheckedUpdateWithoutProjectInput>
  }

  export type ProjectMemberUpdateManyWithWhereWithoutProjectInput = {
    where: ProjectMemberScalarWhereInput
    data: XOR<ProjectMemberUpdateManyMutationInput, ProjectMemberUncheckedUpdateManyWithoutProjectInput>
  }

  export type ProjectCreateWithoutMembersInput = {
    id: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutProjectsInput
  }

  export type ProjectUncheckedCreateWithoutMembersInput = {
    id: string
    userId: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
  }

  export type ProjectCreateOrConnectWithoutMembersInput = {
    where: ProjectWhereUniqueInput
    create: XOR<ProjectCreateWithoutMembersInput, ProjectUncheckedCreateWithoutMembersInput>
  }

  export type UserCreateWithoutProjectMembershipsInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectCreateNestedManyWithoutUserInput
    translations?: TranslationCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberCreateNestedManyWithoutAddedByUserInput
  }

  export type UserUncheckedCreateWithoutProjectMembershipsInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectUncheckedCreateNestedManyWithoutUserInput
    translations?: TranslationUncheckedCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryUncheckedCreateNestedManyWithoutUserInput
    addedMembers?: ProjectMemberUncheckedCreateNestedManyWithoutAddedByUserInput
  }

  export type UserCreateOrConnectWithoutProjectMembershipsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutProjectMembershipsInput, UserUncheckedCreateWithoutProjectMembershipsInput>
  }

  export type UserCreateWithoutAddedMembersInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectCreateNestedManyWithoutUserInput
    translations?: TranslationCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAddedMembersInput = {
    id: string
    githubId: number
    username: string
    email: string
    avatarUrl?: string | null
    createdAt?: Date | string
    projects?: ProjectUncheckedCreateNestedManyWithoutUserInput
    translations?: TranslationUncheckedCreateNestedManyWithoutUserInput
    translationHistory?: TranslationHistoryUncheckedCreateNestedManyWithoutUserInput
    projectMemberships?: ProjectMemberUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAddedMembersInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAddedMembersInput, UserUncheckedCreateWithoutAddedMembersInput>
  }

  export type ProjectUpsertWithoutMembersInput = {
    update: XOR<ProjectUpdateWithoutMembersInput, ProjectUncheckedUpdateWithoutMembersInput>
    create: XOR<ProjectCreateWithoutMembersInput, ProjectUncheckedCreateWithoutMembersInput>
    where?: ProjectWhereInput
  }

  export type ProjectUpdateToOneWithWhereWithoutMembersInput = {
    where?: ProjectWhereInput
    data: XOR<ProjectUpdateWithoutMembersInput, ProjectUncheckedUpdateWithoutMembersInput>
  }

  export type ProjectUpdateWithoutMembersInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProjectsNestedInput
  }

  export type ProjectUncheckedUpdateWithoutMembersInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUpsertWithoutProjectMembershipsInput = {
    update: XOR<UserUpdateWithoutProjectMembershipsInput, UserUncheckedUpdateWithoutProjectMembershipsInput>
    create: XOR<UserCreateWithoutProjectMembershipsInput, UserUncheckedCreateWithoutProjectMembershipsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutProjectMembershipsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutProjectMembershipsInput, UserUncheckedUpdateWithoutProjectMembershipsInput>
  }

  export type UserUpdateWithoutProjectMembershipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUpdateManyWithoutUserNestedInput
    translations?: TranslationUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserUncheckedUpdateWithoutProjectMembershipsInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUncheckedUpdateManyWithoutUserNestedInput
    translations?: TranslationUncheckedUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUncheckedUpdateManyWithoutUserNestedInput
    addedMembers?: ProjectMemberUncheckedUpdateManyWithoutAddedByUserNestedInput
  }

  export type UserUpsertWithoutAddedMembersInput = {
    update: XOR<UserUpdateWithoutAddedMembersInput, UserUncheckedUpdateWithoutAddedMembersInput>
    create: XOR<UserCreateWithoutAddedMembersInput, UserUncheckedCreateWithoutAddedMembersInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAddedMembersInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAddedMembersInput, UserUncheckedUpdateWithoutAddedMembersInput>
  }

  export type UserUpdateWithoutAddedMembersInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUpdateManyWithoutUserNestedInput
    translations?: TranslationUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAddedMembersInput = {
    id?: StringFieldUpdateOperationsInput | string
    githubId?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    projects?: ProjectUncheckedUpdateManyWithoutUserNestedInput
    translations?: TranslationUncheckedUpdateManyWithoutUserNestedInput
    translationHistory?: TranslationHistoryUncheckedUpdateManyWithoutUserNestedInput
    projectMemberships?: ProjectMemberUncheckedUpdateManyWithoutUserNestedInput
  }

  export type ProjectCreateManyUserInput = {
    id: string
    name: string
    repository: string
    accessControl?: string
    sourceLanguage?: string
    createdAt?: Date | string
  }

  export type TranslationCreateManyUserInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    status?: string
    commitSha?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TranslationHistoryCreateManyUserInput = {
    id: string
    translationId: string
    projectId: string
    language: string
    key: string
    value: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
  }

  export type ProjectMemberCreateManyUserInput = {
    id: string
    projectId: string
    status?: string
    role?: string
    addedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberCreateManyAddedByUserInput = {
    id: string
    projectId: string
    userId: string
    status?: string
    role?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    members?: ProjectMemberUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    members?: ProjectMemberUncheckedUpdateManyWithoutProjectNestedInput
  }

  export type ProjectUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    repository?: StringFieldUpdateOperationsInput | string
    accessControl?: StringFieldUpdateOperationsInput | string
    sourceLanguage?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TranslationHistoryUpdateManyWithoutTranslationNestedInput
  }

  export type TranslationUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    history?: TranslationHistoryUncheckedUpdateManyWithoutTranslationNestedInput
  }

  export type TranslationUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    translation?: TranslationUpdateOneRequiredWithoutHistoryNestedInput
  }

  export type TranslationHistoryUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    translationId?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    translationId?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutMembersNestedInput
    addedByUser?: UserUpdateOneWithoutAddedMembersNestedInput
  }

  export type ProjectMemberUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    addedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    addedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUpdateWithoutAddedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    project?: ProjectUpdateOneRequiredWithoutMembersNestedInput
    user?: UserUpdateOneRequiredWithoutProjectMembershipsNestedInput
  }

  export type ProjectMemberUncheckedUpdateWithoutAddedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyWithoutAddedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryCreateManyTranslationInput = {
    id: string
    projectId: string
    language: string
    key: string
    value: string
    userId: string
    action: string
    commitSha?: string | null
    createdAt?: Date | string
  }

  export type TranslationHistoryUpdateWithoutTranslationInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutTranslationHistoryNestedInput
  }

  export type TranslationHistoryUncheckedUpdateWithoutTranslationInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TranslationHistoryUncheckedUpdateManyWithoutTranslationInput = {
    id?: StringFieldUpdateOperationsInput | string
    projectId?: StringFieldUpdateOperationsInput | string
    language?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    commitSha?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberCreateManyProjectInput = {
    id: string
    userId: string
    status?: string
    role?: string
    addedBy?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProjectMemberUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProjectMembershipsNestedInput
    addedByUser?: UserUpdateOneWithoutAddedMembersNestedInput
  }

  export type ProjectMemberUncheckedUpdateWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    addedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProjectMemberUncheckedUpdateManyWithoutProjectInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    role?: StringFieldUpdateOperationsInput | string
    addedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}