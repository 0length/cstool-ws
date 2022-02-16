import ServerConstructor from "./ServerConstructor";

export default class ServerConnector {
    #servers: Record<ServerConstructor["name"], ServerConstructor["graphClass"]> | Object = {};
    getServer(name) {
        return this.#servers[name];
    }

    setServer(obj: ServerConstructor) {
        this.#servers[obj.name] = new obj.graphClass(this);
        return this.#servers[obj.name];
    }
}