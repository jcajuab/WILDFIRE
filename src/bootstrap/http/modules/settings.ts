import { CheckPermissionUseCase } from "#/application/use-cases/rbac";
import {
  GetMaintenanceSettingsUseCase,
  UpdateMaintenanceSettingsUseCase,
} from "#/application/use-cases/settings";
import {
  type SettingsRouterDeps,
  type SettingsRouterUseCases,
} from "#/interfaces/http/routes/settings/shared";

export interface SettingsHttpModule {
  deps: SettingsRouterDeps;
  useCases: SettingsRouterUseCases;
}

export const createSettingsHttpModule = (
  deps: Omit<SettingsRouterDeps, "checkPermissionUseCase">,
): SettingsHttpModule => {
  const routerDeps: SettingsRouterDeps = {
    ...deps,
    checkPermissionUseCase: new CheckPermissionUseCase({
      authorizationRepository: deps.repositories.authorizationRepository,
    }),
  };

  return {
    deps: routerDeps,
    useCases: {
      getMaintenanceSettings: new GetMaintenanceSettingsUseCase({
        maintenanceSettingsRepository:
          routerDeps.repositories.maintenanceSettingsRepository,
      }),
      updateMaintenanceSettings: new UpdateMaintenanceSettingsUseCase({
        maintenanceSettingsRepository:
          routerDeps.repositories.maintenanceSettingsRepository,
      }),
    },
  };
};
