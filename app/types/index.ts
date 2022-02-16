import { DocumentNode } from 'graphql';
import { SubscriptionServerOptions } from './../../node_modules/apollo-server-core/src'
import Config from "./../../config";

export type Action = {
    type: string;
    payload: any
}
export type Presence = {
    cs_id: string;
    type: "online_unsubscribed" | "online_subscribed" | "login_approved" | "login_requested" | "login_rejected";
}

export type ListenArgs = (string | number | (({ url, subscriptionsUrl }: { url: any; subscriptionsUrl: any; }) => void))[]
export type ServerConfig = {
    path: string;
    listenArgs: ListenArgs;
    playground: boolean;
}
export interface SubscriptionConnection {
    onConnect: (
        connectionParams: { authorization?: string },
    ) => any;
    onDisconnect: SubscriptionServerOptions["onDisconnect"]
}

export type CSContext = {
    cs_id: string;
}

export type CSCreateContext = boolean | {
    cs_id: string;
} | undefined
export interface GenericGraph {
    _typeDefs: DocumentNode
    _resolvers: () => any
    modules: () => {
        typeDefs: GenericGraph["_typeDefs"];
        resolvers: any;
    }[]

}

export interface SubscriptionGraph extends GenericGraph {
    _onConnect: () => (connectionParams: any) => Promise<any>
    _onDisconnect: () => (_ws: any, context: any) => Promise<void>
    subscriptions: () => SubscriptionConnection | undefined
}

export type PartialRecord<K extends string | number | symbol, T> = { [P in K]?: T; };