import { sequelize } from '../sequelize.js';
import { setupAssociations } from './associations.js';

import { Site } from './site.model.js';
import { Equipment } from './equipment.model.js';
import { EquipmentPassport } from './equipment-passport.model.js';
import { MaintenanceRequest } from './maintenance-request.model.js';
import { RequestStatusHistory } from './request-status-history.model.js';
import { Technician } from './technician.model.js';
import { RequestAssignee } from './request-assignee.model.js';

setupAssociations();

export {
  sequelize,
  Site,
  Equipment,
  EquipmentPassport,
  MaintenanceRequest,
  RequestStatusHistory,
  Technician,
  RequestAssignee,
};