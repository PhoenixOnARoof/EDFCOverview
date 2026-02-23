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

const MARKET_COMMAND = {
  name: 'market',
  description: 'View market data from last docked station',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const SHIPYARD_COMMAND = {
  name: 'shipyard',
  description: 'View shipyard and outfitting data',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const COMMUNITYGOALS_COMMAND = {
  name: 'communitygoals',
  description: 'View current community goals',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const JOURNAL_COMMAND = {
  name: 'journal',
  description: 'View journal data',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const SHIPS_COMMAND = {
  name: 'ships',
  description: 'View all your owned ships',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const SQUADRON_COMMAND = {
  name: 'squadron',
  description: 'View your squadron information',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LASTSTARPORT_COMMAND = {
  name: 'laststarport',
  description: 'View last docked starport information',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LASTSYSTEM_COMMAND = {
  name: 'lastsystem',
  description: 'View last system information',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LOGOUT_COMMAND = {
  name: 'logout',
  description: 'Unlink your Frontier account from Discord',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [LOGIN_COMMAND, LOGOUT_COMMAND, FLEETCARRIER_COMMAND, PROFILE_COMMAND, MARKET_COMMAND, SHIPYARD_COMMAND, COMMUNITYGOALS_COMMAND, JOURNAL_COMMAND, SHIPS_COMMAND, SQUADRON_COMMAND, LASTSTARPORT_COMMAND, LASTSYSTEM_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
