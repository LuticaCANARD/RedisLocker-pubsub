import type { RedisClientType } from 'redis';
import defaultSetting from './settings/lockersetting.js';
import type { RedisLockerSetting } from './settings/lockersetting.js';

export class RedisLocker {

    private redisClients:RedisClientType;
    private setting : RedisLockerSetting;
    private callback : ()=>void;
    private targetName :string;
    private targetChannel : string;
    constructor(
        origin : RedisClientType,
        channel : string,
        callback : ()=>void ,
        setting?:RedisLockerSetting
    )
    {
        this.redisClients = origin;
        this.setting = setting;

        this.targetName = channel;
        this.targetChannel = `${channel}_locker`;
        this.redisClients.connect();
        this.redisClients.subscribe(this.targetChannel,(msg:string)=>{
            callback();
        });
    }
    getClient = () => this.redisClients; // DO NOT ACCESS REDIS CLIENT DIRECTLY!
    /**
     * 1. 
     */
    changeCallback = (newCallback:()=>void)=>{
        this.callback = newCallback; 
        this.redisClients.connect();
        this.redisClients.unsubscribe(this.targetChannel);
        this.redisClients.subscribe(this.targetChannel,(msg:string)=>{
            this.callback();
        });

    };

    getLock = ()=>{
        
    }


}