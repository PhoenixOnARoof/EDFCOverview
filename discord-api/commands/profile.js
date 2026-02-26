import { createCommand } from "../utils/createCommand.js";
import { InteractionResponseFlags } from "discord-interactions";
import { EmbedBuilder, SlashCommandIntegerOption } from "@discordjs/builders";
import { getCarrier, getCommander } from "../utils/cAPIs.js";
import { shareButton } from "../utils/share.js";

export const data = createCommand('profile', 'View your commander profile').addIntegerOption(new SlashCommandIntegerOption().setAutocomplete(true).setName('accounts').setDescription('Select the account you wish to view'));

export const login_required = true;
export const ephemeral = true;

export async function execute(interaction) {

    try {

        const commanderInfo = await getCommander(interaction.user.access_token, interaction.user.selectedFrontierId);

        const carrierInfo = await getCarrier(interaction.user.access_token, interaction.user.selectedFrontierId);

        const embed = createCommanderEmbed(commanderInfo.commander, carrierInfo);

        return interaction.editReply({ embeds: [embed], components: [shareButton()], flags: InteractionResponseFlags.EPHEMERAL });

    } catch (error) {

        console.error('Profile error:', error);

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Error')
            .setDescription(`Error fetching profile: ${error.message}`);

        return interaction.editReply({ embeds: [embed], components: [], flags: InteractionResponseFlags.EPHEMERAL });

    }

}

export async function autocomplete() { }

export function createCommanderEmbed(commander, carrier) {
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
                name: 'Carrier',
                value: carrier.name.name + ` (${carrier.name.callsign})` || 'N/A',
                inline: false,
            },
        ],
        footer: {
            text: 'Commander Profile',
        },
    };
}