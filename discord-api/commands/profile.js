import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { frontier, users } from "../db/schema.js";
import { createCommand } from "../utils/createCommand.js";
import { InteractionResponseFlags } from "discord-interactions";
import { EmbedBuilder } from "@discordjs/builders";

export const data = createCommand('profile', 'View your commander profile');

export async function execute(interaction) {

    const id = BigInt(interaction.user.id);

    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (!user) {
        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Not Logged In')
            .setDescription('You need to login first! Use `/login` to link your Frontier account.');

        return interaction.reply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });
    }

    await interaction.deferReply();

    try {

        const [account] = await db.select().from(frontier).where(eq(frontier.id, user.selectedFrontierId));

        const embed = new EmbedBuilder().setTitle(account.cmdrName).setDescription('Master of ' + account.carrierName).setFooter({ text: 'Ship: ' + account.shipName }).addFields({ name: 'Credits', value: (account.credits).toString() });

        return await interaction.editReply({
            embeds: [
                embed
            ],
            flags: InteractionResponseFlags.EPHEMERAL
        })

    } catch (error) {

        console.error('Profile error:', error);

        const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Error')
            .setDescription(`Error fetching profile: ${error.message}`);

        return interaction.editReply({ embeds: [embed], components: [], flags: InteractionResponseFlags.EPHEMERAL });

    }

}