import {
	ApolloServer
} from "apollo-server"
import {
	ServerConfig,
	SubscriptionConnection
} from "../types"
import access from "./../utils/access";

interface ServerParam {
	modules: any
	subscriptions?: SubscriptionConnection
	serverConfig: ServerConfig
}
export default class ServerCreator {

	public static create(serverParam: ServerParam) {
		const {
			modules,
			subscriptions,
			serverConfig: {
				listenArgs,
				path,
				playground
			}
		} = serverParam;
		const server = new ApolloServer({
			modules,
			playground,
			...{
				path
			},
			context: async (connectionParams) => {
				const {
					req,
					connection
				} = connectionParams;
				if (req) return access.token.validate(req.headers["authorization"]);
				if (connection) return connection.context;
			},
			cacheControl: {
				calculateHttpHeaders: false,
			},
			...{
				subscriptions
			}
		});
		return server.listen(...listenArgs);
	};
}