import { EmbedBuilder } from "discord.js";
import { createCommand } from "../utils/createCommand.js";
import { getCarrier } from "../utils/cAPIs.js";
import { frontier } from "../db/schema.js";
import db from "../db/index.js";
import csvs, { capitalizer } from "../utils/FAssetIDs.js";
import { shareButton } from "../utils/share.js";
import { InteractionResponseFlags } from "discord-interactions";
import { eq } from "drizzle-orm";

export const data = createCommand('market', 'View market data from the last docked station');

export const login_required = true;

export const ephemeral = true;

export async function execute(interaction) {

    const [cmdrName] = await db
        .select({
            cmdrName: frontier.cmdrName
        })
        .from(frontier)
        .where(eq(frontier.id, interaction.user.selectedFrontierId));

    const carrier = await getCarrier(interaction.user.access_token, interaction.user.selectedFrontierId);

    const commodities = (carrier.orders?.commodities?.sales || []).filter(x => x.stock).map(x => ({
        name: capitalizer(csvs.commodity[x.name]),
        value: `${x.stock} (${x.price} CR)`,
        inline: true
    }));

    const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setThumbnail(interaction.user.avatarURL())
        .setTitle(`${cmdrName.cmdrName}'s Offers`)
        .addFields(...commodities);

    return interaction.editReply({ embeds: [embed], components: [shareButton()], flags: InteractionResponseFlags.EPHEMERAL });

}