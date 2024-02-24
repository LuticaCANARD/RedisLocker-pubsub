import type { RedisLockerSetting } from './lockersetting';

export type RedisClusterLockerSetting = {

    circleTime : number
    redisConnectionSetting:RedisLockerSetting
};
