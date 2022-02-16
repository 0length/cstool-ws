import config from "../config";
import redis from 'redis';
import uuid from 'node-uuid';

class Session {
    basicClientOption = {
        port: Number(process.env.REDIS_PORT),               // replace with your port
        host: process.env.REDIS_HOST,        // replace with your hostanme or IP address
        password: process.env.REDIS_PASSWORD,
    };

    authCache = redis.createClient({
        prefix: 'cstool-ws:auth:',
        ...this.basicClientOption
    });

    csCache = redis.createClient({
        prefix: 'cstool-ws:cs:',
        ...this.basicClientOption
    });

    getJson = (resolve) => (err, reply) => {
        try {
            const result = reply ? JSON.parse(reply) : reply
            resolve(result);
        } catch (error) {
            resolve(reply);
        }
    };

    async create(userData, lifeTime = 0) {
        if (userData && userData.id) {
            const sessionID = uuid.v4();
            await this.authCache.set(sessionID, userData.id.toString());
            await this.csCache.set(userData.id.toString(), JSON.stringify(userData));
            if (lifeTime || config.session.exp)
                await this.authCache.expire(sessionID, lifeTime || config.session.exp);
            return sessionID;
        }
        throw new Error("Key id required on Data Object!");
    }

    getDetail(id = "") {
        return new Promise((resolve, reject) => {
            this.csCache.get(id.toString(), this.getJson(resolve));
        });
    }

    getId(key) {
        return new Promise((resolve, reject) => {
            this.authCache.get(key.toString(), this.getJson(resolve));
        });
    }

    destroy(key) {
        return new Promise((resolve, reject) => {
            this.authCache.get(key.toString(), (err, reply) => {
                if (reply) this.authCache.del(key);
                resolve(reply);
            });
        });
    }
}
export default Session;