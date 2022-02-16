import servers from "../../servers";
export default class ServerConstructor {
    name: keyof typeof servers;
    graphClass: typeof servers[keyof typeof servers];
    constructor(name: keyof typeof servers, graphClass: typeof servers[typeof name]) {
        this.name = name;
        this.graphClass = graphClass;
    }

    callback() {
        return ({ url, subscriptionsUrl }) => {
            console.log(`🚀 ${this.name} server ready at ${url}`);
            console.log(`🚀 ${this.name} Subscriptions ready at ${subscriptionsUrl}`);
        }
    }
}