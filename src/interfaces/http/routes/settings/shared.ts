import { type Hono } from "hono";
import { type AuthSessionRepository } from "#/application/ports/auth";
import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import { type AuthorizationRepository } from "#/application/ports/rbac";
import { type CheckPermissionUseCase } from "#/application/use-cases/rbac";
import {
  type GetMaintenanceSettingsUseCase,
  type UpdateMaintenanceSettingsUseCase,
} from "#/application/use-cases/settings";
import { type JwtUserVariables } from "#/interfaces/http/middleware/jwt-user";
import { type AuthorizePermission } from "#/interfaces/http/routes/shared/error-handling";

export interface SettingsRouterDeps {
  jwtSecret: string;
  authSessionRepository: AuthSessionRepository;
  authSessionCookieName: string;
  repositories: {
    maintenanceSettingsRepository: MaintenanceSettingsRepository;
    authorizationRepository: AuthorizationRepository;
  };
  checkPermissionUseCase: CheckPermissionUseCase;
}

export interface SettingsRouterUseCases {
  getMaintenanceSettings: GetMaintenanceSettingsUseCase;
  updateMaintenanceSettings: UpdateMaintenanceSettingsUseCase;
}

export type SettingsRouter = Hono<{ Variables: JwtUserVariables }>;

export type { AuthorizePermission };

export const settingsTags = ["Settings"];
