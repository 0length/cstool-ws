import 'firebase/auth'
import 'firebase/database'
import 'firebase/storage'
import config from '../../config'
import firebase from 'firebase/app'
import { BehaviorSubject } from 'rxjs'
import logger from './logfile'
export default class ConfigSubject {
    sub = {};
    db;
    common;
    configs;
    constructor() {
        if (!firebase.apps.length)
            firebase.initializeApp(config.firebaseConfig);
        this.db = firebase.database();
        this.common = {};
        this.db.ref(process.env.FB_DOWNLOAD_REF||"download_url").on('value', (snapshot) => {
            this.common.downloads = snapshot.val();
        });
        this.db.ref("graphed_remote_config").on('value', (snapshot) => {
            this.configs = snapshot.child("configs").val();
            const envKeys = Object.keys(this.configs);
            this.common.errors = snapshot.child("errors").val();
            this.common.loadings = snapshot.child("loadings").val();
            envKeys.map((env) => {
                this.sub[env] = this.sub[env] || new BehaviorSubject({});
                this.sub[env].next({ env, configs: this.configs[env], ...this.common });
            });
        });
        console.log("Firebase Config Sub Initialised");
    }

    once(env: string) {
        if(this.sub[env] && this.configs[env])
            this.sub[env].next({ env, configs: this.configs[env], ...this.common });
        else if(this.sub[env] && !this.configs[env])
        this.db.ref("graphed_remote_config").once('value', (snapshot) => {
            this.configs = snapshot.child("configs").val();
            if(this.sub[env] && this.configs[env])
                this.sub[env].next({ env, configs: this.configs[env], ...this.common });
        });
    }
}