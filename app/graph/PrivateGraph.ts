import { version } from "./../../package.json";
import { gql } from "apollo-server";
import { Action, CSContext, GenericGraph, Presence } from "../types";
import ServerConnector from "../server/ServerConnector";
import PublicGraph from "./PublicGraph";
import Session from "../Session";
export default class PrivateGraph implements GenericGraph {
    approve: (presence: Presence) => void;
    dispatch: (cs_id: CSContext["cs_id"], action: Action) => void;
    broadcast: (action: Action) => void;
    getOnline;
    getLogin;
    session = new Session();
    constructor(serverConnector: ServerConnector) {
        this.approve = (presence: Presence) => {
            const csSub = (serverConnector.getServer("public") as PublicGraph).store.csSub[presence.cs_id];
            if (csSub && csSub.login) {
                csSub.login.next(presence);
                return true;
            }
            return false;
        };
        this.dispatch = (cs_id, action) => {
            const csSub = (serverConnector.getServer("public") as PublicGraph).store.csSub[cs_id]
            if (csSub && csSub.action) {
                // setTimeout(() => {
                console.log("private dispatch");

                csSub.action.next(action);
                // }, 5000);
                return true;
            }
            return false;
        };

        this.broadcast = (action) => {
            const allSub = Object.values((serverConnector.getServer("public") as PublicGraph).store.csSub).filter((sub) => sub.action);
            if (allSub.length) {
                allSub.map((sub) => sub.action.next(action));
                return true;
            }
            return false;
        };
        this.getOnline = () => (serverConnector.getServer("public") as PublicGraph)._getCsIdByPropName("action");
        this.getLogin = () => (serverConnector.getServer("public") as PublicGraph)._getCsIdByPropName("login");
    }

    _validateAppContext(context) {
        const { env, app } = context;
        if (!env) throw new Error("env not found!");
        if (!app || app !== "control")
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
            Menu: 'audit',
            Query: {
                approvalUpdate: async (obj: any, { cs_id, state: type }: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.approve({ cs_id, type });
                },
                dispatch: (obj: any, { cs_id, action }: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.dispatch(cs_id, action);
                },
                broadcast: (obj: any, { action }: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.broadcast(action);
                },
                createSession: async (obj: any, { data, lifetime_in_seconds }: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.session.create(data, lifetime_in_seconds);
                },
                destroySession: async (obj: any, { key }: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.session.destroy(key);
                },
                serviceVersion: async (obj: any, args: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return version;
                },
                onlineList: async (obj: any, args: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.getOnline();
                },
                loginList: async (obj: any, args: any, context: any, info: any) => {
                    this._validateAppContext(context);
                    return this.getLogin();
                }
            },
        }
    }

    _typeDefs = gql`

    enum PresenceTypeState {
        online_unsubscribed
        online_subscribed
        login_requested
        login_approved
        login_rejected
    }

    enum PresenceApprovalTypeState {
        login_rejected
        login_approved
    }

    type Presence {
        cs_id: String
        type: PresenceTypeState
    }

    scalar Payload

    input ActionInput {
        type: String
        payload: Payload
    }

    scalar SessionDataInput
    
    scalar DetailCs

    extend type Query {
        approvalUpdate(cs_id: String!, state: PresenceApprovalTypeState!): Boolean
        dispatch(cs_id: String!, action: ActionInput!): Boolean
        broadcast(action: ActionInput!): Boolean
        createSession(data: SessionDataInput!, lifetime_in_seconds: Int): String
        destroySession(key: String!): Boolean
        serviceVersion: String
        onlineList: [DetailCs]
        loginList: [DetailCs]

    }
    `;
}