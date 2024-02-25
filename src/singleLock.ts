import type { RedisClientOptions,RedisClientType } from 'redis';
import defaultSetting from './settings/lockersetting.js';
import redis from 'redis';
import type { RedisLockerSetting } from './settings/lockersetting.js';
export class RedisLocker {

    private redisClient : RedisClientType<any, any, any>;
    private redisClientForPub : RedisClientType<any, any, any>;

    private setting : RedisLockerSetting;
    private targetName :string;
    private targetChannel : string;
    private getLock = false;
    private targetSemaphoreName : string;
    private mySemaphoreKey:string;
    private isSubscribing = false;
    private needLock = false;
    private callback : () => void;

    constructor(
        originSetting : RedisClientOptions,
        targetName : string,
        setting?:RedisLockerSetting
    )
    {
        // Just doing setting...
        this.redisClient = redis.createClient(originSetting);
        this.redisClientForPub = redis.createClient(originSetting);
        this.setting = setting ?? defaultSetting;
        this.targetName = targetName;
        this.targetChannel = `${targetName}_locking_publish`;
        this.targetSemaphoreName = `${targetName}_locker`;
        this.mySemaphoreKey = String(Date.now());
    }
    getClient = () => this.redisClient; // DO NOT ACCESS REDIS CLIENT DIRECTLY!

    #settingRedisConnection = async()=>{
        if(!this.redisClient.isReady)
            await this.redisClient.connect();
        if(!this.redisClientForPub.isReady)
            await this.redisClientForPub.connect();
    };

    /**
     * Set Lock.
     * @author : Lutica_CANARD
     * @returns if fail to get semaphore, return false. else, return true
     */
    locking = async ()=>{
        // Prepare Redis connection.
        await this.#settingRedisConnection();
        // Try get locking semaphore
        // how can I get `semaphore`?
        // DEFINE : `semaphore` -> get by `SET NX target_name ... `
        try{
            //await this.redisClient.watch(this.targetSemaphoreName);
            const getResult = await this.redisClientForPub.setNX(this.targetSemaphoreName,this.mySemaphoreKey);
            if(getResult === true)
            {
                // IF OK ... > got Locked...
                // If there is no occupation about lock, get semaphore

                await this.redisClientForPub.expire(this.targetSemaphoreName,this.setting.expireTime);
                this.getLock = true;
                if(this.callback != undefined){
                    this.callback();
                }
                return true;
            }
            else
            {
                // IF NIL ... > occupied...

                this.getLock = false;
                this.needLock = true;
                this.isSubscribing = true;
                return false;
            }
        }
        catch(e)
        {
            console.error(e);
            return false;
        }
    };
    /**
     * Release Lock.
     * @author : Lutica_CANARD
     */
    release = async ()=>{
        await this.#settingRedisConnection();
        this.needLock = false;
        // if I have lock, send signal that I'm releasing lock...
        if(this.getLock && await this.redisClient.get(this.targetSemaphoreName) === this.mySemaphoreKey)
        {
            try{
                // release my lock...
                await this.redisClient.del(this.targetSemaphoreName);

                console.log('release...',this.targetChannel);
                // and then, publish my unlocking event. 
                await this.redisClientForPub.publish(this.targetChannel,'unlock');

                // finally, unlock my instance.
                this.getLock = false;
                this.isSubscribing = false;

                return true;
            }
            catch(e){
                return false;
            }
        }
        return false;

    };

    /**
     * try and repeating get lock until this object get lock. 
     * @returns 
     */
    awaitGetLock = async ( maxTimeTry?:number )=>{
        const maxMs = maxTimeTry === -1 ? Infinity : maxTimeTry ?? this.setting.maxTime;  
        let tryCount = 0;
        this.needLock = true;
        if(this.isSubscribing === false)
        {
            await this.locking();
        }
        while(this.isSubscribing === true && this.getLock !== true)
        {
            // working by locking()...
            if(tryCount > maxMs) break;
            tryCount++;
        }

        return this.getLock;
    };
    asyncGetLock = ( callback:()=>void ) =>{
        if( this.getLock===true ){
            callback();
            return;
        }
        this.callback = callback;
        this.needLock = true;
        if(this.isSubscribing === false)
        {
            this.locking().then();
        }
    };


    startSubscribe = async ()=>{
        // Do subscribe target channel.
        console.log('inserted');
        await this.redisClient.subscribe(this.targetChannel,this.#tryGetSemaphoreMessage);
            
    };
    #tryGetSemaphoreMessage = async (msg:string)=>{
        if( this.needLock === true && msg === 'unlock') await this.locking();
    };
    get nowLocking()
    { 
        return this.getLock;
    }
    get limitTime()
    {
        return this.setting.expireTime;
    }
}