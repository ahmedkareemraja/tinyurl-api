import { type Express, Router } from 'express';

import { requireToken } from '../middlewares';

import authRouterV1 from './auth/auth.routes.v1';
import usersRouterv1 from './users/users.routes.v1';

interface RouteDefinition {
  path: string;
  router: Router;
}

const routerConfig: {
  publicRoutes: RouteDefinition[];
  privateRoutes: RouteDefinition[];
} = {
  publicRoutes: [
    { path: '/api/v1/users', router: usersRouterv1 },
    { path: '/api/v1/auth', router: authRouterV1 },
  ],
  privateRoutes: [],
};

export default (app: Express) => {
  const routerPublic = Router();
  const routerPrivate = Router();

  routerPrivate.use(requireToken);

  routerConfig.publicRoutes.forEach((route) => {
    routerPublic.use(route.path, route.router);
  });

  routerConfig.privateRoutes.forEach((route) => {
    routerPrivate.use(route.path, route.router);
  });

  app.use(routerPublic);
  app.use(routerPrivate);
};
