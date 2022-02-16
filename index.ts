const environmentSetup = ()=>{
  require('dotenv').config();
}

const monitorSetup = ()=>{
  if(process.env.MONITOR_ACTIVE==="true")
  {
    const metric = require('appmetrics-dash').monitor({
      host: process.env.MONITOR_HOST || 'localhost',
      port: process.env.MONITOR_PORT || 4003,
      title: process.env.APOLLO_GRAPH_ID || process.env.APP_NAME || "Monitoring",
      docs: "/graphql/docs"
    });
    metric.on('initialized', function (env) {
      env = metric.getEnvironment();
      for (const entry in env) {
          console.log(entry + ':' + env[entry]);
      };
    });
  }
}

const boot = ()=>{
  console.log("=================");
  console.log(Date());
  console.log("=================");
  environmentSetup();
  monitorSetup();
}

const docs = ()=>{
  if(process.env.DOCS_ACTIVE==="true"){
    const express = require('express');
    const serveIndex = require('serve-index');
    const server = express();
    const [ port, host ] = [process.env.DOCS_PORT||4004, process.env.DOCS_HOST || 'localhost']
    server.use("/graphql/docs", express.static(__dirname + '/docs'), serveIndex(__dirname + '/docs', {icons: true}));
    server.listen(port, host, ()=>{
      console.log(
        "Static Documentation served "
          .concat("on ")
          .concat(host.toString())
          .concat(":")
          .concat(port.toString())
      )
    });
  }
}

boot()
docs();

import config from './config'
import ServerConnector from './app/server/ServerConnector';
import servers from './servers';
import ServerConstructor from './app/server/ServerConstructor';
import ServerCreator from './app/server/ServerCreator';



const main = () => {
  console.log(Object.keys(servers));
  const serverConnector = new ServerConnector();
  Object.keys(servers).map((name) => {
    const server = new ServerConstructor(name as keyof typeof servers, servers[name])
    const connectedServer = serverConnector.setServer(server);
    const creating = ServerCreator.create({
      modules: connectedServer.modules(),
      subscriptions: connectedServer.subscriptions ? connectedServer.subscriptions() : undefined,
      serverConfig: config.server[server.name]
    });
    creating.then(server.callback());
  })
}


main();