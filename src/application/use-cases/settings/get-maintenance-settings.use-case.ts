import { type MaintenanceSettingsRepository } from "#/application/ports/maintenance-settings";
import {
  type MaintenanceSettingsView,
  toMaintenanceSettingsView,
} from "./maintenance-settings-view";

export class GetMaintenanceSettingsUseCase {
  constructor(
    private readonly deps: {
      maintenanceSettingsRepository: MaintenanceSettingsRepository;
    },
  ) {}

  async execute(): Promise<MaintenanceSettingsView> {
    return toMaintenanceSettingsView(
      await this.deps.maintenanceSettingsRepository.get(),
    );
  }
}
