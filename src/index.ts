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
        // Just doing setting...
        this.redisClients = origin;
        this.setting = setting;
        this.targetName = channel;
    }
    getClient = () => this.redisClients; // DO NOT ACCESS REDIS CLIENT DIRECTLY!
    /**
     * 
     * @author : Lutica_CANARD
     */
    changeCallback = (newCallback:()=>void)=>{
        this.callback = newCallback; 
        this.redisClients.connect();
        this.redisClients.unsubscribe(this.targetChannel);
        this.redisClients.subscribe(this.targetChannel,(msg:string)=>{
            this.callback();
        });

    };

    /**
     * Set Lock.
     * @author : Lutica_CANARD
     * @returns if fail to get semaphore, return false. else, return true
     */
    locking = ()=>{
        // Try get locking semaphore

        // If there is no occupation about lock,
        // make queue, and 

        // If there is queue about waiting lock, 
        // Do append to queue

    }
    /**
     * Release Lock.
     * @author : Lutica_CANARD
     */
    release = ()=>{
        // if I have lock, send signal that I'm releasing lock...

        // and then, delete from queue.
    }


}