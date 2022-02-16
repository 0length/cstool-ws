import config from '../../config';
import Session from './../Session';

const errorException = (message) => {
    console.log(message)
    return false;
}

const session = new Session();

const access = {
    token: {
        validate: async (Authorization = "") => {
            const arrAuth = Authorization.split(" ")
            if (arrAuth.length !== 2)
                return false;
            const availableAuthMethod = {
                "Bearer": async (token: string) => {
                    const cs_id = await session.getId(token);
                    return cs_id ? { cs_id, token } : false;
                },
                "Token": (token: string) => {
                    return {}
                },
                "App": (token: string) => {
                    const arrToken = token.split(":");
                    if (arrToken.length !== 3)
                        return errorException("Error with token format! Format mustbe 'App [app]:[env]:[secret]'");
                    const [userApp, userEnv, userToken] = arrToken;
                    if (config.appSecret[userApp] && config.appSecret[userApp][userEnv])
                        if (userToken === config.appSecret[userApp][userEnv])
                            return {
                                app: userApp,
                                env: userEnv
                            };
                    return errorException("Invalid token!");
                }
            };
            if (!Object.keys(availableAuthMethod).filter((method) => method !== arrAuth[0]).length)
                return errorException("Invalid Authorization!");
            if (availableAuthMethod[arrAuth[0]]) {
                const context = await availableAuthMethod[arrAuth[0]](arrAuth[1]);
                return context;
            }
            return errorException("Invalid Authorization Method!");
        },
        create: (context) => console.log("creating token"),
    }
}

export default access