import { EmbedBuilder } from "discord.js";
import { createCommand } from "../utils/createCommand.js";
import { shareButton } from "../utils/share.js";
import { getCarrier } from "../utils/cAPIs.js";

export const data = createCommand('carrier', 'View your fleet carrier information');

export async function execute(interaction) {

    const fleetcarrier = await getCarrier(interaction.user.access_token, interaction.user.selectedFrontierId);

    const embed = createFleetCarrierEmbed(fleetcarrier);

    return interaction.reply({
        embeds: [embed],
        components: [shareButton('carrier')]
    });

}

function createFleetCarrierEmbed(fc) {
    const formatCredits = (amount) => {
        return Number(amount).toLocaleString();
    };

    const stateColors = {
        normalOperation: 0x22c55e,
        decommissioned: 0xef4444,
        reserved: 0xf59e0b,
    };

    const vanityName = fc.name?.name;

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