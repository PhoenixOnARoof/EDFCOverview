import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const LOGIN_COMMAND = {
  name: 'login',
  description: 'Link your Frontier account with Discord',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const FLEETCARRIER_COMMAND = {
  name: 'carrier',
  description: 'View your fleet carrier information',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const PROFILE_COMMAND = {
  name: 'profile',
  description: 'View your commander profile',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [LOGIN_COMMAND, FLEETCARRIER_COMMAND, PROFILE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
