import { gql } from 'apollo-server';
import { BehaviorSubject, identity, Observable, Subject, timer, UnaryFunction } from "rxjs";
import { debounce, filter, map, share, tap, throttleTime } from 'rxjs/operators';
import { Action, Presence, SubscriptionGraph } from "../types";
import access from '../utils/access';
import observableToIterator from '../utils/observableToAsyncIterator';
import ConfigSubject from '../utils/ConfigSubject';
import ServerConnector from '../server/ServerConnector';
import DebugGraph from './DebugGraph';
import Session from '../Session';
import { pipeFromArray } from 'rxjs/internal/util/pipe';

// type PresenceSub = Presence | {}

type CSSubProps = {
    login: Subject<Presence>;
    action: Subject<Action>;
}

type CSSubs = {
    [index: string]: CSSubProps;
}

type ADSubs = {
    cs_approval: Subject<{}>;
    cs_online: Subject<{}>;
    notify: Subject<{}>;
}

type CSSubStore = { csSub: CSSubs };

//  Test wss
export default class PublicGraph implements SubscriptionGraph {
    session = new Session();
    middleware = (sub_name) => [
        debounce(() => timer(Number(process.env.PUBLIC_DELAY ||3000))),
        tap((i) => {
            this._logger('new item', sub_name, i);
            // console.log(i);
        })
    ];

    _logger(...message) {
        const parsedMessage = message.map((param) => typeof param === "object" ? JSON.stringify(param).substring(0, 50) : param)
        console.log(...parsedMessage);
    }
    debugServer: () => DebugGraph;
    constructor(serverConnector: ServerConnector) {
        this.debugServer = () => (serverConnector.getServer("debug") as DebugGraph);
        if (this.debugServer) {
            this._logger = (...message) => this.debugServer().logger(...message);
        }
    }

    store: CSSubStore = { csSub: {} };

    adSub: ADSubs = {
        cs_approval: new Subject(),
        cs_online: new Subject(),
        notify: new Subject()
    };

    configSub = new ConfigSubject();

    modules() {
        return [{
            typeDefs: this._typeDefs,
            resolvers: this._resolvers()
        }]
    }

    _onConnect() {
        return async ({ authorization = "" }) => {
            if (!authorization) return false;
            const connectionContext = await access.token.validate(authorization);
            this._logger("new conn", "context", connectionContext);
            return connectionContext;
        }

    }

    _onDisconnect() {
        return async (_ws, context) => {
            const { cs_id } = await context.initPromise;
            if (cs_id) {
                const activeChanels = Object.keys(this.store.csSub[cs_id]) as Array<keyof CSSubProps>;
                this.store.csSub = {
                    ...this.store.csSub,
                    [cs_id]: {}
                };
                activeChanels.map((channel) => this._emmitAdSubOnDisconnect(channel));
                this.debugServer().emmitCsSubUpdate();
            }
        }
    }

    _emmitAdSubOnDisconnect(propName: keyof CSSubProps) {
        type SubMap = { [P in keyof CSSubProps]: Subject<{}> }
        const subMap: SubMap = {
            action: this.adSub.cs_online,
            login: this.adSub.cs_approval
        };
        subMap[propName].next(this._getCsIdByPropName(propName));
    }

    async _getCsIdByPropName(propName: keyof CSSubProps) {
        const csIds = Object.keys(this.store.csSub).filter((cs_id) => this.store.csSub[cs_id][propName]);
        const asyncRes = await Promise.all(csIds.map((cs_id) => {
            return this.session.getDetail(cs_id);
        }));
        return asyncRes;
    }

    async _emmitAdSubCsOnline() {
        const csOnline = await this._getCsIdByPropName("action");
        setTimeout(() => {
            this.adSub.cs_online.next(csOnline);
        }, 300);
        return csOnline;
    }

    async _emmitAdSubCsApproval() {
        const csApproval = await this._getCsIdByPropName("login");
        setTimeout(() => {
            this.adSub.cs_approval.next(csApproval);
        }, 300);
        return csApproval;
    }

    _requestApproval(cs_id) {
        const asWaiting: Presence = { cs_id, type: "login_requested" };
        this.store.csSub[cs_id] = { ...this.store.csSub[cs_id] };
        this.store.csSub[cs_id].login = new Subject();
        this.store.csSub[cs_id].login.next(asWaiting);
        this.debugServer().emmitCsSubUpdate();
        this._emmitAdSubCsApproval();
        this._notifyRequestApproval(cs_id);
    }

    async _notifyRequestApproval(cs_id){
        const { name, ip, division }: any = await this.session.getDetail(cs_id);
        if(name && ip)
            this.adSub.notify.next({
                division,
                status: 'pendding',
                message:`<code>${name}</code> send a login request from <code>${ip}</code>`
            });
    }

    _validateAdContext(context) {
        const { env, app } = context;
        if (!env) throw new Error("env not found!");
        if (!app || app !== "control")
            throw new Error("invalid app used!");
    }

    _validateCsContext(context) {
        const { cs_id, token } = context;
        if (!cs_id) throw new Error("cs_id not found!");
        if (!token) throw new Error("cs_id not found!");
    }

    subscriptions() {
        return {
            onConnect: this._onConnect(),
            onDisconnect: this._onDisconnect()
        };
    }

    iterator(obs: Observable<unknown>, middlewares: Array<any>) {
        return observableToIterator(pipeFromArray(middlewares as UnaryFunction<unknown, unknown>[])(obs) as Observable<unknown>);
    }

    _filterDivision(division) {
        return async (i) =>{
            const csList =  await i;
            return division ? csList.filter((i) => division.indexOf(i.division.id)!==-1) : csList;
        }
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
                remote_config: {
                    subscribe: async (obj: any, args: any, context: any, info: any) => {
                        const { env } = context;
                        if (!env) throw new Error("env not found!");
                        this.configSub.once(env);
                        return this.iterator(this.configSub.sub[env], [
                            throttleTime(Number(process.env.PUBLIC_DELAY || 3000)),
                            share(),
                            map((item: any) => ({ remote_config: item }))
                        ]);
                    }
                },
                ad_cs_approval: {
                    subscribe: (obj: any, { division }: any, context: any, info: any) => {
                        this._validateAdContext(context);
                        this._emmitAdSubCsApproval();
                        return this.iterator(this.adSub.cs_approval, [
                            ...this.middleware('ad_cs_approval'),
                            map(this._filterDivision(division)),
                            map((item: any) => ({ ad_cs_approval: item }))
                        ]);
                    }
                },
                ad_cs_online: {
                    subscribe: (obj: any, { division }: any, context: any, info: any) => {
                        this._validateAdContext(context);
                        this._emmitAdSubCsOnline();
                        return this.iterator(this.adSub.cs_online, [
                            ...this.middleware('ad_cs_online'),
                            map(this._filterDivision(division)),
                            map((item: any) => ({ ad_cs_online: item }))
                        ]);
                    }
                },
                ad_notif: {
                    subscribe: (obj: any, { division }: any, context: any, info: any) => {
                        this._validateAdContext(context);
                        return this.iterator(this.adSub.notify, [
                            ...this.middleware('ad_notif'),
                            filter(({division})=>division),
                            filter((i: any) => division ? division.indexOf(i.division.id)!==-1:i),
                            map((item: any) => ({ ad_notif: item }))
                        ]);
                    }
                },
                cs_login: {
                    subscribe: async (obj: any, args: any, context: any, info: any) => {
                        this._validateCsContext(context);
                        const { cs_id, token } = context;
                        this._requestApproval(cs_id);
                        return this.iterator(this.store.csSub[cs_id].login, [
                            ...this.middleware('cs_login'),
                            map((item)=>{
                                if(
                                    token && item 
                                    && (item as any).type
                                    && (item as any).type === "login_rejected"
                                )
                                    this.session.destroy(token);
                                return item;
                            }),
                            map((item: any) => ({ cs_login: item }))
                        ]);
                    }
                },
                cs_action: {
                    subscribe: async (obj: any, args: any, context: any, info: any) => {
                        this._validateCsContext(context);
                        const { cs_id } = context;
                        this.store.csSub[cs_id] = { ...this.store.csSub[cs_id] };
                        this.store.csSub[cs_id].action = new Subject();
                        this.debugServer().emmitCsSubUpdate();
                        return this.iterator(this.store.csSub[cs_id].action, [
                            ...this.middleware('cs_action'),
                            map((item) => ({ cs_action: item }))
                        ]);
                    }
                },
                ping: {
                    subscribe: async (obj: any, args: any, context: any, info: any) => {
                        return this.iterator(new BehaviorSubject("pong"), [
                            ...this.middleware('ping'),
                            map((item) => ({ ping: item }))
                        ]);
                    }
                }
            }
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
    
    scalar FirebaseRealtimeData

    type Presence {
        cs_id: String
        type: PresenceTypeState
    }

    scalar Payload

    scalar AuditNotification

    type Action {
        payload: Payload
        type: String
    }

    type Config {
        env: String
        configs: FirebaseRealtimeData
        errors: FirebaseRealtimeData
        loadings: FirebaseRealtimeData
        downloads: FirebaseRealtimeData
    }

    extend type Query {
        empty: String
    }

    scalar DetailCs

    extend type Subscription {
        remote_config: Config
        ad_cs_approval(division: [Int]): [DetailCs]
        ad_cs_online(division: [Int]): [DetailCs]
        ad_notif(division: [Int]): AuditNotification
        cs_login: Presence
        cs_action: Action
        ping: String
    }
    `;

}