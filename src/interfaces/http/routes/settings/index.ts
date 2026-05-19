import { Hono } from "hono";
import { type JwtUserVariables } from "#/interfaces/http/middleware/jwt-user";
import { createPermissionMiddleware } from "#/interfaces/http/middleware/permissions";
import { registerMaintenanceSettingsRoutes } from "./maintenance.route";
import { type SettingsRouterDeps, type SettingsRouterUseCases } from "./shared";

export type { SettingsRouterDeps } from "./shared";

export interface SettingsRouterModule {
  deps: SettingsRouterDeps;
  useCases: SettingsRouterUseCases;
}

export const createSettingsRouter = ({
  deps,
  useCases,
}: SettingsRouterModule) => {
  const router = new Hono<{ Variables: JwtUserVariables }>();
  const { authorize } = createPermissionMiddleware({
    jwtSecret: deps.jwtSecret,
    checkPermissionUseCase: deps.checkPermissionUseCase,
    authSessionRepository: deps.authSessionRepository,
    authSessionCookieName: deps.authSessionCookieName,
  });

  registerMaintenanceSettingsRoutes({ router, useCases, authorize });

  return router;
};
