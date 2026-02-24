export function hexToString(hex) {
  if (!hex) return null;
  try {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  } catch {
    return hex;
  }
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

  const vanityName = fc.name?.vanityName ? hexToString(fc.name.vanityName) : null;

  return {
    color: stateColors[fc.state] || 0x6b7280,
    title: `FC ${fc.name.callsign} - ${fc.currentStarSystem}`,
    fields: [
      {
        name: 'Name',
        value: vanityName || 'None',
        inline: true,
      },
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
    color: statusColor,
    title: `CMDR ${commander.name}`,
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
    color: 0x3b82f6,
    title: `Market - ${market.name}`,
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
    color: 0x8b5cf6,
    title: `Shipyard - ${shipyard.name}`,
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
      color: 0x6b7280,
      title: 'Community Goals',
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
    color: 0xf59e0b,
    title: 'Community Goals',
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

  const formatHealth = (health) => {
    return `${(health / 10000).toFixed(1)}%`;
  };

  const ships = profile.ships || {};
  const shipEntries = Object.values(ships);
  const currentShip = profile.ship;
  const currentShipId = profile.commander.currentShipId;
  
  if (shipEntries.length === 0 && !currentShip) {
    return {
      color: 0x6b7280,
      title: 'Your Ships',
      description: 'You don\'t own any ships',
      footer: {
        text: 'Ships',
      },
    };
  }

  const totalValue = shipEntries.reduce((sum, ship) => sum + (ship.value?.total || 0), 0);

  const fields = [];

  if (currentShip) {
    fields.push({
      name: '⭐ Current Ship',
      value: `**${currentShip.shipName || currentShip.name}** (${currentShip.shipID || 'N/A'})\n` +
        `Type: ${currentShip.name}\n` +
        `Hull: ${formatHealth(currentShip.health?.hull || 0)} | Shields: ${formatHealth(currentShip.health?.shield || 0)}\n` +
        `Location: ${currentShip.starsystem?.name || 'Unknown'} @ ${currentShip.station?.name || 'N/A'}`,
      inline: false,
    });
  }

  const otherShips = shipEntries.filter(s => s.id !== currentShipId).sort((a, b) => b.value.total - a.value.total);
  
  if (otherShips.length > 0) {
    fields.push({
      name: 'Other Ships',
      value: otherShips.slice(0, 15).map(ship => {
        const value = ship.value || {};
        return `• ${ship.shipName || ship.name} (${ship.shipID || 'N/A'}) - ${ship.name} | ${formatCredits(value.total)} CR | ${ship.starsystem?.name || 'Unknown'}`;
      }).join('\n'),
      inline: false,
    });
  }

  fields.push({
    name: 'Fleet Summary',
    value: `Total Ships: ${shipEntries.length}\nTotal Value: ${formatCredits(totalValue)} CR`,
    inline: true,
  });

  return {
    color: 0x10b981,
    title: `CMDR ${profile.commander.name}'s Fleet`,
    fields,
    footer: {
      text: 'Ships',
    },
  };
}

export function createSquadronEmbed(profile) {
  const squadron = profile.squadron;
  
  if (!squadron || !squadron.name) {
    return {
      color: 0x6b7280,
      title: 'Squadron',
      description: 'You are not part of a squadron',
      footer: {
        text: 'Squadron',
      },
    };
  }

  return {
    color: 0xec4899,
    title: `Squadron: ${squadron.name}`,
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
      color: 0x6b7280,
      title: 'Last Starport',
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
    color: 0x06b6d4,
    title: `Last Starport: ${starport.name}`,
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
      color: 0x6b7280,
      title: 'Last System',
      description: 'No system data available',
      footer: {
        text: 'System',
      },
    };
  }

  return {
    color: 0x8b5cf6,
    title: `Last System: ${system.name}`,
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

export function createSuitEmbed(profile) {
  const suit = profile.suit;
  const launchBays = profile.launchBays;
  
  if (!suit || !suit.name) {
    return {
      color: 0x6b7280,
      title: 'Suit',
      description: 'No suit data available',
      footer: {
        text: 'Suit',
      },
    };
  }

  const fields = [
    {
      name: 'Suit',
      value: suit.locName || suit.name,
      inline: true,
    },
    {
      name: 'ID',
      value: suit.suitId?.toString() || 'N/A',
      inline: true,
    },
  ];

  if (suit.state?.health?.hull) {
    fields.push({
      name: 'Health',
      value: `${(suit.state.health.hull / 10000).toFixed(1)}%`,
      inline: true,
    });
  }

  if (launchBays && Object.keys(launchBays).length > 0) {
    const srvList = Object.entries(launchBays).map(([slot, data]) => {
      const subSlot = data.SubSlot;
      return subSlot ? `${subSlot.locName || subSlot.name} (${subSlot.loadoutName || subSlot.loadout})` : null;
    }).filter(Boolean);

    if (srvList.length > 0) {
      fields.push({
        name: 'SRVs',
        value: srvList.join('\n'),
        inline: false,
      });
    }
  }

  return {
    color: 0x14b8a6,
    title: `Suit: ${suit.locName || suit.name}`,
    fields,
    footer: {
      text: 'On Foot',
    },
  };
}
