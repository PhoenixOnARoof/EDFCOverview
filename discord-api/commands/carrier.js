import { createCommand } from "../utils/createCommand.js";
import { shareButton } from "../utils/share.js";
import { getCarrier } from "../utils/cAPIs.js";
import { InteractionResponseFlags } from "discord-interactions";
import { SlashCommandIntegerOption } from "discord.js";

export const data = createCommand('carrier', 'View your fleet carrier information').addIntegerOption(option =>
    option.setAutocomplete(true).setName('accounts').setDescription('Select the account you wish to view')
)

export const login_required = true;

export async function execute(interaction) {

    const fleetcarrier = await getCarrier(interaction.user.access_token, interaction.user.selectedFrontierId);

    const embed = createFleetCarrierEmbed(fleetcarrier);

    return interaction.editReply({
        embeds: [embed],
        components: [shareButton('carrier')],
        flags: InteractionResponseFlags.EPHEMERAL
    });

}

export async function autocomplete() { }

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