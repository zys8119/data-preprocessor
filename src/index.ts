import { get, unionWith, isEqual } from "lodash";
export type SerializeDef = {
  [key: string]:
    | [string | ((data: any, value: any) => any)]
    | [string, any]
    | number
    | string
    | boolean;
};
export type SerializeGetData<T extends Parameters<typeof get>> = T extends [
  infer _,
  ...infer R
]
  ? [URLSearchParams | Record<string, any> | object, ...R]
  : never;
export type SerializeGetMessage =
  | string
  | ((
      fieldName: string,
      data: {
        data: any;
        value: any;
        fieldName: string;
        defaultValue: any;
        get: typeof get;
        path: any;
      }
    ) => string | Promise<any>);

export type SerializeGetConvertType =
  | "number"
  | "string"
  | "boolean"
  | "null"
  | "undefined"
  | "object"
  | "array"
  | "json"
  | "url"
  | "date"
  | "datetime"
  | "regexp"
  | ((value: any) => any);
const convertTypeValue = (convertType: SerializeGetConvertType, value: any) => {
  if (convertType === "number") {
    return Number(value);
  }
  if (convertType === "string") {
    return String(value);
  }
  if (convertType === "boolean") {
    return Boolean(value);
  }
  if (convertType === "array") {
    return Array.from(value);
  }
  if (convertType === "date") {
    return new Date(value);
  }
  if (convertType === "datetime") {
    const datetime = new Date();
    datetime.setTime(value);
    return datetime;
  }
  if (convertType === "null") {
    return null;
  }
  if (convertType === "undefined") {
    return undefined;
  }
  if (convertType === "url") {
    return decodeURIComponent(value);
  }
  if (convertType === "regexp") {
    return new RegExp(value);
  }
  if (["object", "array", "json"].includes(convertType as any)) {
    return JSON.parse(value);
  }
  return typeof convertType === "function"
    ? convertType(value) || value
    : value;
};

const utils = {
  ids(value: any) {
    if (!Array.isArray(value)) return "";
    return value
      .map((item) => item?.id)
      .filter((item) => item)
      .join(",");
  },
  fileIds(value: any) {
    if (!Array.isArray(value)) return "";
    return value
      .filter((item) => !item.status)
      .map((item) => item?.id)
      .filter((item) => item)
      .join(",");
  },
  array<T = any>(value: T): T[] {
    return [value];
  },
};
export type SerializeDefDataObject<T> = T;
export type SerializeDefData<T> =
  | SerializeDefDataObject<T>
  | SerializeDefDataObject<T>[];
type Utils = typeof utils;
export type UtilsReturnType<T extends keyof Utils, P> = T extends "array"
  ? P[]
  : Utils[T] extends (value?: any) => infer U
  ? U
  : never;
export type FilterUndefined<
  T extends object,
  Filter extends boolean
> = Filter extends true
  ? {
      [P in keyof T]: T[P] extends undefined ? never : T[P];
    }
  : T;
export type SerializeDefDataReturn<T, M extends SerializeDef> = T extends object
  ? Omit<T, keyof M> & {
      [K in keyof M as M[K] extends true ? never : K]: M[K] extends [string]
        ? any
        : M[K] extends [(...args: any[]) => infer A]
        ? A
        : M[K] extends [string, infer A]
        ? A
        : never;
    }
  : T;
export type SerializeGetAllDets =
  | string
  | {
      name: string;
      as?: string;
      default?: any;
      convertType?: SerializeGetConvertType;
      required?: boolean | SerializeGetMessage;
    };
export type SerializeGetAllDetsMap<
  T extends readonly SerializeGetAllDets[],
  D extends Readonly<Record<any, any>>
> =
  | {
      [K in T[number] as K extends { as: string }
        ? K["as"]
        : K extends { name: string }
        ? K["name"]
        : K extends string
        ? K
        : string]: K extends { convertType: string }
        ? any
        : K extends { convertType: (...args: any[]) => any }
        ? ReturnType<K["convertType"]>
        : K extends { default: any }
        ? K["default"]
        : D[K];
    };
export class Serialize {
  static defaultConfig = {
    requiredMessage: (fieldName: string) => {
      return `字段【${fieldName}】必填项不能为空`;
    },
    requiredMessageError(errorMessage: string): void {
      throw errorMessage;
    },
  };
  static setConfig(config: Partial<typeof Serialize.defaultConfig>) {
    Object.assign(Serialize.defaultConfig, config);
  }

  static preprocessor<T extends object>(data: T): T;
  static preprocessor<
    T extends object,
    U extends {
      [P in keyof T]?: keyof Utils | ((value: T[P]) => any) | string[];
    },
    Clear extends boolean
  >(
    data: T,
    maps?: U,
    clear?: Clear
  ): FilterUndefined<
    {
      [P in keyof U | keyof T]: U[P] extends keyof Utils
        ? P extends keyof T
          ? UtilsReturnType<U[P], T[P]>
          : any
        : U[P] extends string[]
        ? Clear extends true
          ? any
          : P extends keyof T
          ? T[P]
          : any
        : U[P] extends (value?: any) => infer V
        ? V
        : P extends keyof T
        ? T[P]
        : any;
    } & {
      [P in string]: any;
    },
    Clear
  >;
  static preprocessor<T extends object>(
    data: T,
    maps?: {
      [P in keyof T]?: keyof typeof utils | ((value: T[P]) => any) | string[];
    },
    clear = true
  ): Record<string, any> {
    if (Object.prototype.toString.call(data) !== "[object Object]") return data;
    const dataBackup: Record<string, any> = { ...data };
    if (maps) {
      for (const key in maps) {
        const map = maps[key];
        if (typeof map === "string") {
          dataBackup[key] = utils[map as keyof typeof utils](data[key]);
          continue;
        }
        if (Array.isArray(map)) {
          map.forEach((item, index) => {
            dataBackup[item] = (data[key] as unknown as any[])?.[index];
          });
          if (clear && !map.includes(key)) {
            delete dataBackup[key];
          }
          continue;
        }
        dataBackup[key] = map?.(data[key]);
      }
    }
    if (clear) {
      for (const key in dataBackup) {
        if (
          typeof dataBackup[key] === "undefined" ||
          dataBackup[key] === null
        ) {
          delete dataBackup[key];
        }
      }
    }
    return dataBackup;
  }
  /**
   * 序列化数据
   * @param data
   * @param defMap
   */
  static def<D, M extends SerializeDef = SerializeDef>(
    data: D,
    defMap?: M,
    excludeReg?: RegExp
  ): SerializeDefDataReturn<D, M>;
  static def(data: any, defMap: any = {}, excludeReg: RegExp): any {
    if (Object.prototype.toString.call(data) === "[object Array]") {
      return data.map((d: any) => this.def(d, defMap, excludeReg));
    } else if (Object.prototype.toString.call(data) === "[object Object]") {
      for (const k in defMap) {
        if (Object.prototype.toString.call(defMap[k]) === "[object Array]") {
          if (
            Object.prototype.toString.call(defMap[k][0]) === "[object Function]"
          ) {
            data[k] = (defMap[k][0] as any)(data, data[k]) as any;
          } else {
            data[k] = get(data, defMap[k][0] as string, defMap[k][1]);
          }
        } else if (defMap[k] === true) {
          delete data[k];
        } else {
          data[k] = defMap[k];
        }
      }
    }
    if (Object.prototype.toString.call(excludeReg) === "[object RegExp]") {
      for (const k in data) {
        if (excludeReg.test(k)) {
          delete data[k];
        }
      }
    }
    return data;
  }

  /**
   * 获取所有数据
   * @param data
   * @param gets
   */
  static getAll<
    T extends readonly SerializeGetAllDets[] | SerializeGetAllDets[],
    D extends SerializeGetData<Parameters<typeof get>>[0]
  >(
    data: D,
    gets: T
  ): Omit<D, keyof SerializeGetAllDetsMap<T, D>> & SerializeGetAllDetsMap<T, D>;
  static getAll(data: any, gets: any) {
    const res: Record<string, any> = {};
    while (gets.length) {
      const e = gets.shift()!;
      const args = typeof e === "string" ? [true, data, e] : [];
      if (typeof e === "object") {
        args.push(e.required === undefined ? true : e.required);
        if (e.convertType) {
          args.push(e.convertType);
        }
        args.push(data);
        args.push(e.name);
        args.push(e.default);
      }
      res[typeof e === "string" ? e : e.as || e.name] = (Serialize.get as any)(
        ...args
      );
    }
    return Object.assign({}, data, res);
  }

  /**
   * 获取数据
   * @param args
   */
  static get(
    ...data: SerializeGetData<Parameters<typeof get>>
  ): Promise<any> | any;
  static get(
    isRequired: boolean,
    ...data: SerializeGetData<Parameters<typeof get>>
  ): Promise<any> | any;
  static get(
    requiredMessage: SerializeGetMessage,
    ...data: SerializeGetData<Parameters<typeof get>>
  ): Promise<any> | any;
  static get(
    isRequired: boolean,
    convertType: SerializeGetConvertType,
    ...data: SerializeGetData<Parameters<typeof get>>
  ): Promise<any> | any;
  static get(
    requiredMessage: SerializeGetMessage,
    convertType: SerializeGetConvertType,
    ...data: SerializeGetData<Parameters<typeof get>>
  ): Promise<any> | any;
  static get(...args: any[]) {
    const args0 = [
      "[object String]",
      "[object Function]",
      "[object AsyncFunction]",
      "[object Boolean]",
    ].includes(Object.prototype.toString.call(args[0]))
      ? args[0]
      : null;
    const message = [
      "[object String]",
      "[object Function]",
      "[object AsyncFunction]",
    ].includes(Object.prototype.toString.call(args0))
      ? args0
      : null;
    if (args0 !== null) {
      args = args.slice(1);
    }
    let isRequired = args0;
    if (args0 === true || message !== null) {
      isRequired = true;
    }
    const convertType = ["string", "function"].includes(typeof args[0])
      ? args[0]
      : null;
    if (convertType) {
      args = args.slice(1);
    }
    if (
      Object.prototype.toString.call(args[0]) === "[object URLSearchParams]"
    ) {
      args[0] = Object.fromEntries(
        [...args[0].keys()].map((e) => [e, args[0].get(e)])
      );
    }
    const value = get.apply(get, args as any);
    if (
      isRequired &&
      (["[object Null]", "[object Undefined]"].includes(
        Object.prototype.toString.call(value)
      ) ||
        (["[object String]"].includes(Object.prototype.toString.call(value)) &&
          /^\s{0,}$/.test(value)))
    ) {
      const messageErr = (fieldName: string) => {
        if (
          ["[object Function]", "[object AsyncFunction]"].includes(
            Object.prototype.toString.call(message)
          )
        ) {
          return message(fieldName, {
            data: args[0],
            path: args[1],
            defaultValue: args[2],
            value,
            get,
            fieldName,
          });
        }
        return Serialize.defaultConfig.requiredMessage(
          typeof message === "string" ? message : fieldName
        );
      };
      const err = messageErr(args[1]);
      if (Object.prototype.toString.call(err) === "[object Promise]") {
        return err
          .then((err: any) => {
            if (typeof err === "string") {
              throw Error(err);
            }
            return convertTypeValue(convertType, value);
          })
          .catch((err: any) => {
            Serialize.defaultConfig.requiredMessageError(err);
            throw Error(err);
          });
      }
      Serialize.defaultConfig.requiredMessageError(err);
      throw Error(err);
    }

    return convertTypeValue(convertType, value);
  }

  /**
   * 获取分页格式数据
   */
  static getPage<
    T extends boolean | string | true | "true" = false,
    DK extends string = "list"
  >(
    data: Array<
      | Array<any>
      | {
          results: any[];
          [key: string]: any;
        }
      | any
    >,
    {
      pageNo = 1,
      pageSize = 15,
      no_page = false as any,
      total,
      defMap,
      excludeReg,
      mapData,
      reduce,
      reduceInitData = null,
      is_equal = true,
      dataKeyField = "list" as any,
    }: Partial<{
      // 当前页数
      pageNo: number | string;
      // 每页数量
      pageSize: number | string;
      // 是否分页
      no_page: T;
      // 总数
      total: number;
      // defMap
      defMap: SerializeDef;
      // excludeReg
      excludeReg: RegExp;
      // mapData
      mapData(data: any): any;
      // reduce
      reduce(
        previousValue: any,
        currentValue: any,
        currentIndex: number,
        array: any[]
      ): any;
      reduceInitData: any;
      is_equal: boolean;
      dataKeyField: DK;
    }> = {}
  ): T extends true | "true"
    ? Array<any>
    : {
        total: number;
        pageNo: number;
        pageSize: number;
      } & {
        [K in DK]: any[] | number;
      } {
    let list = data.reduce<Array<any>>((a, b) => {
      return a.concat(
        Object.prototype.toString.call(b) === "[object Object]"
          ? (b as any).results
          : b
      );
    }, []);
    const total_index =
      Object.prototype.toString.call(total) === "[object Number]"
        ? total
        : list.length;
    if (is_equal === true) {
      list = unionWith(list, isEqual);
    }
    if (defMap || excludeReg) {
      list = this.def(list, defMap || {}, excludeReg) as unknown as any[];
    }
    if (mapData) {
      list = list.map(mapData);
    }
    if (
      no_page === true ||
      (typeof no_page === "string" && no_page.toLowerCase() === "true")
    ) {
      if (reduce) {
        list = list.reduce(reduce, reduceInitData);
      }
      return list as any;
    } else {
      pageNo = Number(pageNo);
      pageSize = Number(pageSize);
      const startIndex = (pageNo - 1) * pageSize;
      list = list.slice(startIndex, startIndex + pageSize);
      if (reduce) {
        list = list.reduce(reduce, reduceInitData);
      }
      return {
        [dataKeyField]: list,
        total: total_index,
        pageNo,
        pageSize,
      } as any;
    }
  }
}
export default Serialize;
