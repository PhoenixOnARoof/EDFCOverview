import 'dotenv/config';
import { verifyKey } from 'discord-interactions';
import { getFakeUsername } from './game.js';

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    console.log('VERIFY:', { signature: !!signature, timestamp: !!timestamp, clientKey: !!clientKey });

    const isVerified = verifyKey(buf, signature, timestamp, clientKey);
    console.log('isVerified:', isVerified);

    if (!isVerified) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent':
        'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // Log Response
  console.log(res);
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function getServerLeaderboard(guildId) {
  let members = await getServerMembers(guildId, 3);
  members = members
    .map((id, i) => `${i + 1}. <@${id}> (\`${getFakeUsername(i)}\`)`)
    .join('\n');
  return `## :trophy: Server Leaderboard\n*This is a very fake leaderboard that just pulls random server members. Pretend it's pulling real game data and it's much more fun* :zany_face:\n\n### This week\n${members}\n\n### All time\n${members}`;
}

async function getServerMembers(guildId, limit) {
  const endpoint = `guilds/${guildId}/members?limit=${limit}`;

  try {
    const res = await DiscordRequest(endpoint, { method: 'GET' });
    const parsedRes = await res.json();
    return parsedRes.map((member) => member.user.id);
  } catch (err) {
    return console.error(err);
  }
}

export function createPlayerEmbed(profile) {
  return {
    type: 'rich',
    title: `${profile.username} Profile (lvl ${profile.stats.level})`,
    color: 0x968b9f,
    fields: [
      {
        name: `Account created`,
        value: profile.createdAt,
        inline: true,
      },
      {
        name: `Last played`,
        value: profile.lastPlayed,
        inline: true,
      },
      {
        name: `Global rank`,
        value: profile.stats.rank,
        inline: true,
      },
      {
        name: `Combat stats`,
        value: `:smiley: ${profile.stats.wins} wins / :pensive: ${profile.stats.losses} losses`,
      },
      {
        name: `Realms explored`,
        value: profile.stats.realms,
        inline: true,
      },
    ],
    url: 'https://discord.com/developers/docs/intro',
    thumbnail: {
      url: 'https://raw.githubusercontent.com/shaydewael/example-app/main/assets/fake-icon.png',
    },
  };
}

export function createFleetCarrierEmbed(fc) {
  const formatCredits = (amount) => {
    return Number(amount).toLocaleString();
  };

  const stateColors = {
    normalOperation: 0x22c55e,
    decommissioned: 0xef4444,
    reserved: 0xf59e0b,
  };

  return {
    type: 'rich',
    title: `FC ${fc.name.callsign} - ${fc.currentStarSystem}`,
    color: stateColors[fc.state] || 0x6b7280,
    fields: [
      {
        name: 'Balance',
        value: `${formatCredits(fc.balance)} CR`,
        inline: true,
      },
      {
        name: 'Fuel',
        value: `${fc.fuel} T`,
        inline: true,
      },
      {
        name: 'Status',
        value: fc.state,
        inline: true,
      },
      {
        name: 'Cargo',
        value: `${fc.capacity.cargoNotForSale} / ${fc.capacity.freeSpace + fc.capacity.cargoNotForSale}`,
        inline: true,
      },
      {
        name: 'Crew',
        value: `${fc.capacity.crew} / ${fc.capacity.crew + fc.capacity.freeSpace}`,
        inline: true,
      },
      {
        name: 'Docking',
        value: fc.dockingAccess === 'all' ? 'Open to All' : fc.dockingAccess,
        inline: true,
      },
    ],
    footer: {
      text: 'Fleet Carrier',
    },
  };
}

export function createCommanderEmbed(commander) {
  const formatCredits = (amount) => {
    return Number(amount).toLocaleString();
  };

  const statusColor = commander.alive ? 0x22c55e : 0xef4444;

  return {
    type: 'rich',
    title: `CMDR ${commander.name}`,
    color: statusColor,
    fields: [
      {
        name: 'Credits',
        value: `${formatCredits(commander.credits)} CR`,
        inline: true,
      },
      {
        name: 'Debt',
        value: `${formatCredits(commander.debt)} CR`,
        inline: true,
      },
      {
        name: 'Status',
        value: commander.docked ? 'Docked' : 'In Space',
        inline: true,
      },
      {
        name: 'On Foot',
        value: commander.onfoot ? 'Yes' : 'No',
        inline: true,
      },
      {
        name: 'Alive',
        value: commander.alive ? 'Yes' : 'No',
        inline: true,
      },
      {
        name: 'Ship ID',
        value: commander.currentShipId?.toString() || 'N/A',
        inline: true,
      },
    ],
    footer: {
      text: 'Commander Profile',
    },
  };
}

export function createMarketEmbed(market) {
  const formatCredits = (amount) => {
    return Number(amount).toLocaleString();
  };

  const commodityCount = market.commodities?.length || 0;
  const serviceStatus = Object.entries(market.services || {})
    .filter(([_, status]) => status === 'ok')
    .map(([service]) => service)
    .join(', ') || 'None';

  return {
    type: 'rich',
    title: `Market - ${market.name}`,
    color: 0x3b82f6,
    fields: [
      {
        name: 'Station Type',
        value: market.outpostType || 'Unknown',
        inline: true,
      },
      {
        name: 'Commodities',
        value: commodityCount.toString(),
        inline: true,
      },
      {
        name: 'Services',
        value: serviceStatus,
        inline: false,
      },
    ],
    footer: {
      text: `ID: ${market.id}`,
    },
  };
}

export function createShipyardEmbed(shipyard) {
  const shipCount = Object.keys(shipyard.ships?.shipyard_list || {}).length;
  const moduleCount = Object.keys(shipyard.modules || {}).length;

  const serviceStatus = Object.entries(shipyard.services || {})
    .filter(([_, status]) => status === 'ok')
    .map(([service]) => service)
    .join(', ') || 'None';

  return {
    type: 'rich',
    title: `Shipyard - ${shipyard.name}`,
    color: 0x8b5cf6,
    fields: [
      {
        name: 'Station Type',
        value: shipyard.outpostType || 'Unknown',
        inline: true,
      },
      {
        name: 'Ships Available',
        value: shipCount.toString(),
        inline: true,
      },
      {
        name: 'Modules Available',
        value: moduleCount.toString(),
        inline: true,
      },
      {
        name: 'Services',
        value: serviceStatus,
        inline: false,
      },
    ],
    footer: {
      text: `ID: ${shipyard.id}`,
    },
  };
}

export function createCommunityGoalsEmbed(communityGoals) {
  const goals = communityGoals.active || [];
  
  if (goals.length === 0) {
    return {
      type: 'rich',
      title: 'Community Goals',
      color: 0x6b7280,
      description: 'No active community goals',
      footer: {
        text: 'Community Goals',
      },
    };
  }

  const fields = goals.slice(0, 10).map((goal) => {
    const isCompleted = goal.isComplete || false;
    const tierInfo = goal.tierCurrent && goal.tierTotal 
      ? `Tier ${goal.tierCurrent}/${goal.tierTotal}` 
      : '';
    
    return {
      name: `${goal.title || 'Unknown Goal'}`,
      value: `${isCompleted ? '✅ Completed' : '🔄 Active'} | ${tierInfo}\n${goal.exploitName || ''}`.trim(),
      inline: false,
    };
  });

  return {
    type: 'rich',
    title: 'Community Goals',
    color: 0xf59e0b,
    fields,
    footer: {
      text: `${goals.length} goal(s)`,
    },
  };
}

export function createShipsEmbed(profile) {
  const formatCredits = (amount) => {
    return Number(amount).toLocaleString();
  };

  const ships = profile.ships || {};
  const shipEntries = Object.values(ships);
  
  if (shipEntries.length === 0) {
    return {
      type: 'rich',
      title: 'Your Ships',
      color: 0x6b7280,
      description: 'You don\'t own any ships',
      footer: {
        text: 'Ships',
      },
    };
  }

  const sortedShips = shipEntries.sort((a, b) => b.value.total - a.value.total);

  const fields = sortedShips.slice(0, 10).map((ship) => {
    const isCurrentShip = ship.id === profile.commander.currentShipId;
    const location = ship.starsystem?.name || 'Unknown';
    const station = ship.station?.name || '';
    
    return {
      name: `${isCurrentShip ? '⭐ ' : ''}${ship.shipName || ship.name} (${ship.shipID || 'N/A'})`,
      value: `Type: ${ship.name}\nValue: ${formatCredits(ship.value.total)} CR\nLocation: ${location}${station ? ` @ ${station}` : ''}`,
      inline: true,
    };
  });

  const totalValue = shipEntries.reduce((sum, ship) => sum + (ship.value?.total || 0), 0);

  return {
    type: 'rich',
    title: `Your Ships (${shipEntries.length})`,
    color: 0x10b981,
    fields,
    footer: {
      text: `Total Fleet Value: ${formatCredits(totalValue)} CR`,
    },
  };
}

export function createSquadronEmbed(profile) {
  const squadron = profile.squadron;
  
  if (!squadron || !squadron.name) {
    return {
      type: 'rich',
      title: 'Squadron',
      color: 0x6b7280,
      description: 'You are not part of a squadron',
      footer: {
        text: 'Squadron',
      },
    };
  }

  return {
    type: 'rich',
    title: `Squadron: ${squadron.name}`,
    color: 0xec4899,
    fields: [
      {
        name: 'Tag',
        value: `[${squadron.tag || 'N/A'}]`,
        inline: true,
      },
      {
        name: 'Rank',
        value: squadron.rank || 'None',
        inline: true,
      },
      {
        name: 'Joined',
        value: squadron.joined || 'Unknown',
        inline: true,
      },
    ],
    footer: {
      text: 'Squadron',
    },
  };
}

export function createStarportEmbed(profile) {
  const starport = profile.lastStarport;
  
  if (!starport || !starport.name) {
    return {
      type: 'rich',
      title: 'Last Starport',
      color: 0x6b7280,
      description: 'No starport data available',
      footer: {
        text: 'Starport',
      },
    };
  }

  const services = Object.entries(starport.services || {})
    .filter(([_, status]) => status === 'ok')
    .map(([service]) => service);

  return {
    type: 'rich',
    title: `Last Starport: ${starport.name}`,
    color: 0x06b6d4,
    fields: [
      {
        name: 'System',
        value: profile.lastSystem?.name || 'Unknown',
        inline: true,
      },
      {
        name: 'Faction',
        value: starport.faction || 'Unknown',
        inline: true,
      },
      {
        name: 'Minor Faction',
        value: starport.minorfaction || 'Unknown',
        inline: true,
      },
      {
        name: 'Services',
        value: services.length > 0 ? services.join(', ') : 'None',
        inline: false,
      },
    ],
    footer: {
      text: `ID: ${starport.id}`,
    },
  };
}

export function createLastSystemEmbed(profile) {
  const system = profile.lastSystem;
  
  if (!system || !system.name) {
    return {
      type: 'rich',
      title: 'Last System',
      color: 0x6b7280,
      description: 'No system data available',
      footer: {
        text: 'System',
      },
    };
  }

  return {
    type: 'rich',
    title: `Last System: ${system.name}`,
    color: 0x8b5cf6,
    fields: [
      {
        name: 'Name',
        value: system.name,
        inline: true,
      },
      {
        name: 'Faction',
        value: system.faction || 'None',
        inline: true,
      },
      {
        name: 'ID',
        value: system.id?.toString() || 'Unknown',
        inline: true,
      },
    ],
    footer: {
      text: 'Last System',
    },
  };
}
