import redis, { type RedisClientOptions, type RedisClientType } from 'redis';
import { RedisLock } from './lock.js';

export default class RedisLockerClient{
    private pubClients:RedisClientType<any,any,any>[] = null;
    private subClients:RedisClientType<any,any,any>[] = null;
    private LockerClient:Map<string,RedisLock> = null;
    constructor(options?:RedisClientOptions[]) 
    {
        this.pubClients = options.map(o=>redis.createClient(o));
        this.subClients = options.map(o=>redis.createClient(o));
    }

    getLock = (key:string) => new RedisLock(this,key);

    tryLock = (request:RedisLock,maxTime:number,lockTime:number,timeDomain : TimeDomain = TimeDomain.millisecond)=>{

    };
    tryRelease = (request:RedisLock)=>{

    };
    trySet = ()=>{

    }

}
export const enum TimeDomain {
    millisecond = 1,
    second = 2,
}