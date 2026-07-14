import { Express, NextFunction, Request, Response, Router } from 'express';

interface RouteDefinition {
  path: string;
  router: Router;
}

const routerConfig: {
  publicRoutes: RouteDefinition[];
  privateRoutes: RouteDefinition[];
} = {
  publicRoutes: [
    // { path: "", router: undefined },
  ],
  privateRoutes: [
    // { path: "", router: undefined },
  ],
};

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // TODO: implement token verification
  next();
}

export default (app: Express) => {
  const routerPublic = Router();
  const routerPrivate = Router();

  routerPrivate.use(authenticateToken);

  routerConfig.publicRoutes.forEach((route) => {
    routerPublic.use(route.path, route.router);
  });

  routerConfig.privateRoutes.forEach((route) => {
    routerPrivate.use(route.path, route.router);
  });

  app.use(routerPublic);
  app.use(routerPrivate);
};
