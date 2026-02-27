import { EmbedBuilder } from "discord.js";
import { getCarrier } from "../utils/cAPIs";
import { createCommand } from "../utils/createCommand.js";
import db from "../db/index.js";
import { frontier } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { shareButton } from "../utils/share.js";
import { InteractionResponseFlags } from "discord-interactions";

export const data = createCommand('cargo', 'View your current cargo');

export const login_required = true;

export const ephemeral = true;

export async function execute(interaction) {

    const [cmdrName] = await db
        .select({
            cmdrName: frontier.cmdrName
        })
        .from(frontier)
        .where(eq(frontier.id, interaction.user.selectedFrontierId));

    const carrier = await getCarrier(interaction.user.access_token);

    const cargoObj = {};

    for (const x of (carrier.cargo || []).filter(x => x.qty && x.value)) {
        cargoObj[x.locName] = (cargoObj[x.locName] || 0) + x.qty;
    }

    const embed = new EmbedBuilder()
        .setTitle(`${cmdrName.cmdrName}'s Cargo`)
        .setThumbnail(interaction.user.avatarURL())
        .setColor(0x22c55e)
        .addFields(...Object.entries(cargoObj).map(x => ({ name: x[0], value: x[1], inline: true })));

    return interaction.editReply({ embeds: [embed], components: [shareButton()], flags: InteractionResponseFlags.EPHEMERAL });

}