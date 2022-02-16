import servers from "./servers"

type ServerConfig = Record<keyof typeof servers, {
    listenArgs: (string | number | (() => void))[];
    path: string;
    playground: boolean;
}>
const DEFAULT_DOCKER_SERVICE_NAME = "ws";
const server: ServerConfig = {
    public: {
        listenArgs: [process.env.PUBLIC_PORT || 4000, process.env.PUBLIC_HOST || DEFAULT_DOCKER_SERVICE_NAME, () => {
            console.log("Public server listening start.");
        }],
        path: "graph",
        playground: true
    },
    private: {
        listenArgs: [process.env.PRIVATE_PORT || 4001, process.env.PRIVATE_HOST || DEFAULT_DOCKER_SERVICE_NAME, () => {
            console.log("Private server listening start.");
        }],
        path: "graph",
        playground: true
    },
    debug: {
        listenArgs: [process.env.DEBUG_PORT || 4002, process.env.DEBUG_HOST || DEFAULT_DOCKER_SERVICE_NAME, () => {
            console.log("Debug server listening start.");
        }],
        path: "graph",
        playground: true
    }
}

const config = {
    session: {
        exp: Number(process.env.DEFAULT_SESSION_LIFETIME_IN_SECONDS) || 0
    },
    logfile: {
        path: process.env.LOG_FILE_PATH || "log",
        active: process.env.LOG_FILE_ACTIVE || false
    },
    server,
    appSecret: {
        // Connect to proccess env for key and make generator for key
        client: {
            development: process.env.SECRET_CLIENT_DEVELOPMENT,
            staging: process.env.SECRET_CLIENT_STAGING,
            production: process.env.SECRET_CLIENT_PRODUCTION
        },
        debug: {
            all: process.env.SECRET_DEBUG_ALL
        },
        control: {
            all: process.env.SECRET_CONTROL_ALL
        }
    },
    firebaseConfig: {
        "apiKey": "xxx",
        "authDomain": "cs-dashboardxxxxx.firebaseapp.com",
        "databaseURL": "https://cs-dashboard-xxxx.firebaseio.com",
        "projectId": "cs-dashboard-xxxx",
        "storageBucket": "cs-dashboard-xxx.appspot.com",
        "messagingSenderId": "65333329xxx",
        "appId": "1:xxxx6307:web:8f5e4670786exxxx",
        "measurementId": "x-RZLM5xxxx"
    }
}

export default config;
