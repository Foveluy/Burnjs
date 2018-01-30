import * as KoaRouter from 'koa-router';
import * as fs from 'fs';
import logger from './logger';
import { Context } from 'koa';

export class Loader {
    private controller: {
        [key: string]: any
    } = {};
    private service: {
        [key: string]: any
    } = {};
    private koaRouter: any = new KoaRouter;

    private hasLoad: boolean = false;

    private appDir() {
        return __dirname.substr(0, __dirname.length - 4);
    }

    private fileLoader(url: string) {
        const merge = this.appDir() + url;

        return fs.readdirSync(merge).map((name) => {
            return merge + '/' + name;
        });
    }
    private convertController(ctler: object, funcNames: Array<string>) {
        const tmp: { [key: string]: any } = {};
        funcNames.forEach((name) => {
            if (name !== 'constructor') {
                tmp[name] = {
                    class: ctler,
                    funcName: name
                };
            }
        })
        return tmp;
    }

    loadController() {
        const controllers = this.fileLoader('app/controller');
        controllers.forEach((ctl) => {
            const controller = require(ctl);
            const names = Object.getOwnPropertyNames(controller.prototype);

            logger.blue(names);
            this.controller[controller.name] = this.convertController(controller, names);
        })
    }

    loadRouter() {
        const routerUrl = this.appDir() + 'app/router.js';
        const routing = require(routerUrl)({
            controller: this.controller
        });

        Object.keys(routing).forEach((key) => {
            const [method, url] = key.split(' ');
            const d = routing[key];
            this.koaRouter[method](url, async (ctx: Context) => {
                ctx.service = this.service;
                const instance = new d.class(ctx);
                await instance[d.funcName]();
            })
        })

        return this.koaRouter.routes()
    }

    loadService(ctx: Context) {
        if (!this.hasLoad) {
            this.hasLoad = true;
            const service = this.fileLoader('app/service');
            service.forEach((svr) => {
                const sv = require(svr);
                Object.defineProperty(this.service, sv.name, {
                    get: () => {
                        return new sv(ctx);
                    }
                })
            })
        }
        // logger.blue(this.service.user);
    }
}