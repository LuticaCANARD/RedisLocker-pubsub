import type { RedisLockerSetting } from '../settings/lockersetting';

export type RedisClusterLockerSetting = {
    maxExpireTime:number,
    circleTime : number
    redisConnectionSetting:RedisLockerSetting,
    experimentParallelQuery?:boolean
};
