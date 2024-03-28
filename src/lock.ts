import type RedisLockerClient from './factory.js';


export class RedisLock {
    private client:RedisLockerClient = null;
    private key:string = null;
    constructor(mother,key)
    {
        this.client = mother;
        this.key = key;
    }
}