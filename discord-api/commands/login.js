import { InteractionResponseFlags } from "discord-interactions";
import { createCommand } from "../utils/createCommand.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { createOAuthSession } from "../utils/oauth.js";
import db from "../db/index.js";
import { users } from "../db/schema.js";

export const data = createCommand('login', 'Link your Frontier account with Discord');

export async function execute(interaction) {

    const id = interaction.user.id;

    // Let's make the User because curiousity killed the cat :3
    await db.insert(users).values({
        id: BigInt(id)
    }).onConflictDoNothing();

    const { authUrl } = await createOAuthSession(id);

    const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('Link Frontier Account')
        .setDescription('Click the button below to link your Frontier account (Multi-Account support)');

    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Link Frontier Account')
                .setStyle(ButtonStyle.Link)
                .setURL(authUrl)
        );

    return interaction.reply({ embeds: [embed], components: [button], flags: InteractionResponseFlags.EPHEMERAL });

}