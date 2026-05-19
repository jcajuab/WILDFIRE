import { describeRoute, resolver } from "hono-openapi";
import { setAction } from "#/interfaces/http/middleware/observability";
import { requireAdmin } from "#/interfaces/http/middleware/require-admin";
import {
  applicationErrorMappers,
  withRouteErrorHandling,
} from "#/interfaces/http/routes/shared/error-handling";
import { authValidationErrorResponses } from "#/interfaces/http/routes/shared/openapi-responses";
import {
  maintenanceSettingsResponseSchema,
  updateMaintenanceSettingsSchema,
} from "#/interfaces/http/validators/settings.schema";
import { validateJson } from "#/interfaces/http/validators/standard-validator";
import {
  type AuthorizePermission,
  type SettingsRouter,
  type SettingsRouterUseCases,
  settingsTags,
} from "./shared";

export const registerMaintenanceSettingsRoutes = (args: {
  router: SettingsRouter;
  useCases: SettingsRouterUseCases;
  authorize: AuthorizePermission;
}) => {
  const { router, useCases, authorize } = args;

  router.get(
    "/maintenance",
    setAction("settings.maintenance.read", {
      route: "/settings/maintenance",
      resourceType: "maintenance-settings",
    }),
    ...authorize("admin:access"),
    requireAdmin,
    describeRoute({
      description: "Get maintenance settings",
      tags: settingsTags,
      responses: {
        200: {
          description: "Maintenance settings",
          content: {
            "application/json": {
              schema: resolver(maintenanceSettingsResponseSchema),
            },
          },
        },
        ...authValidationErrorResponses,
      },
    }),
    withRouteErrorHandling(
      async (c) => {
        const result = await useCases.getMaintenanceSettings.execute();
        return c.json({ data: result });
      },
      ...applicationErrorMappers,
    ),
  );

  router.patch(
    "/maintenance",
    setAction("settings.maintenance.update", {
      route: "/settings/maintenance",
      resourceType: "maintenance-settings",
    }),
    ...authorize("admin:access"),
    requireAdmin,
    validateJson(updateMaintenanceSettingsSchema),
    describeRoute({
      description: "Update maintenance settings",
      tags: settingsTags,
      responses: {
        200: {
          description: "Updated maintenance settings",
          content: {
            "application/json": {
              schema: resolver(maintenanceSettingsResponseSchema),
            },
          },
        },
        ...authValidationErrorResponses,
      },
    }),
    withRouteErrorHandling(
      async (c) => {
        const payload = c.req.valid("json");
        const result =
          await useCases.updateMaintenanceSettings.execute(payload);
        return c.json({ data: result });
      },
      ...applicationErrorMappers,
    ),
  );
};
