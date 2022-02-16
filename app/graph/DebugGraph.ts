import { gql } from "apollo-server-core";
import { Subject } from "rxjs";
import { map } from "rxjs/operators";
import ServerConnector from "../server/ServerConnector";
import Session from "../Session";
import { SubscriptionGraph } from "../types";
import access from "../utils/access";
import l from "../utils/logfile"
import observableToIterator from "../utils/observableToAsyncIterator";
import PublicGraph from "./PublicGraph";

export default class DebugGraph implements SubscriptionGraph {
    session = new Session();
    publicServer: () => PublicGraph;
    constructor(serverConnector: ServerConnector) {
        this.publicServer = () => serverConnector.getServer("public") as PublicGraph
    }

    logSub = new Subject();
    csSub = new Subject();

    logger(...message) {
        const parsedMessage = message.map((param) => typeof param === "object" ? JSON.stringify(param).substring(0, 50) : param);
        this.logSub.next(parsedMessage.join(" : "));
        l(...parsedMessage);
    }

    emmitCsSubUpdate() {
        const ids = Object.keys(this.publicServer().store.csSub);
        const newMapped = {};
        ids.map((key) => {
            const activeSub = Object.keys(this.publicServer().store.csSub[key])
            if (activeSub.length) {
                newMapped[key] = { activeSub, detail: this.session.getDetail(key) }
            }
        });
        this.csSub.next(newMapped);
    }

    _onConnect() {
        return async ({ authorization = "" }) => {
            if (!authorization) return false;
            const connectionContext = await access.token.validate(authorization);
            return connectionContext;
        }

    }
    _onDisconnect() {
        return async (_ws: any, context: any) => { }
    }

    subscriptions() {
        return {
            onConnect: this._onConnect(),
            onDisconnect: this._onDisconnect()
        }
    }

    _validateAppContext(context) {
        const { env, app } = context;
        if (!env) throw new Error("env not found!");
        if (!app || app !== "debug")
            throw new Error("invalid app used!");
    }

    modules() {
        return [{
            typeDefs: this._typeDefs,
            resolvers: this._resolvers()
        }]
    }

    _resolvers() {
        return {
            Menu: 'main',
            Query: {
                empty(): string {
                    return 'query service disable!';
                }
            },
            Subscription: {
                logger: {
                    subscribe: async (obj: any, args: any, context: any, info: any) => {
                        this._validateAppContext(context);
                        this.logger("Logger Start!");
                        return observableToIterator(
                            this.logSub.pipe(
                                map((item: any) => ({ logger: item }))
                            )
                        );
                    }
                },
                cs: {
                    subscribe: async (obj: any, args: any, context: any, info: any) => {
                        this._validateAppContext(context);
                        this.emmitCsSubUpdate()
                        return observableToIterator(
                            this.csSub.pipe(
                                map((item: any) => ({ cs: item }))
                            )
                        );
                    }
                }
            }
        }
    }

    _typeDefs = gql`
    extend type Query {
        empty: String
    }
    scalar Cs
    extend type Subscription {
        logger: String
        cs: Cs
    }
    `
}