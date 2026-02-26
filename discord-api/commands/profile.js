import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { frontier, users } from "../db/schema.js";
import { createCommand } from "../utils/createCommand.js";
import { InteractionResponseFlags } from "discord-interactions";
import { EmbedBuilder } from "@discordjs/builders";

export const data = createCommand('profile', 'View your commander profile');

export const login_required = true;

export async function execute(interaction) {

    const id = BigInt(interaction.user.id);

    try {

        // const [account] = await db.select().from(frontier).where(eq(frontier.id, interaction.user.selectedFrontierId));

        // const embed = new EmbedBuilder().setTitle(account.cmdrName).setDescription('Master of ' + account.carrierName).setFooter({ text: 'Ship: ' + account.shipName }).addFields({ name: 'Credits', value: (account.credits).toLocaleString() });

        // return await interaction.editReply({
        //     embeds: [
        //         embed
        //     ],
        //     flags: InteractionResponseFlags.EPHEMERAL
        // })

    } catch (error) {

        console.error('Profile error:', error);

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Error')
            .setDescription(`Error fetching profile: ${error.message}`);

        return interaction.editReply({ embeds: [embed], components: [], flags: InteractionResponseFlags.EPHEMERAL });

    }

}