import {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuComponent,
    StringSelectMenuInteraction,
    TextChannel
} from "discord.js";
import client from "../client";
import logError from "../../helpers/errorLogger";
import config from "../../configuration";
import { firstMessage, textChannel, toEmbed } from "../../helpers/common";
import { OptionalRole } from "./autoRoles.types";

export async function handleRoleSelectInteraction(interaction: StringSelectMenuInteraction) {
    const component = <StringSelectMenuComponent>interaction.component;
    const guild = client.guilds.cache.first()!;
    const member = await guild.members.fetch(interaction.user.id);
    if (member == null) {
        await interaction.reply({ content: "Nem található a felhasználó!", ephemeral: true });
        return;
    }
    const removed = component.options
    .filter(option => !interaction.values.includes(option.value))
    .map(role => guild.roles.cache.get(role.value))
    .filter(role => role != null);
    for (const id of removed)
        await member.roles.remove(id!);
    for (const id of interaction.values)
        await member.roles.add(id);
    await interaction.reply({ ephemeral: true, content: "A rangjaid frissítve lettek!" });
}

export default async function initRoleSelection() {
    try {
        const channel = textChannel(config.roleSelection.channel);
        const first = await firstMessage(channel);
        if (first == null)
            await sendInteractionMessage(channel);
    } catch (err) {
        logError("Something went wrong intializing role system", err);
    }
}

export async function sendInteractionMessage(channel: TextChannel) {
    const cfg = config.roleSelection;
    const embed = toEmbed(cfg.embed);
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
        new StringSelectMenuBuilder()
        .setCustomId("roleSelect")
        .setPlaceholder("Semmi sincs kiválasztva")
        .setMinValues(0)
        .setMaxValues(cfg.options.length)
        .addOptions(cfg.options.map(optionToActionMapper))
    );

    await channel.send({ embeds: [ embed ], components: [ row ] });
}

function optionToActionMapper(option: OptionalRole) {
    return {
        label: option.name,
        description: option.description,
        value: option.id
    };
}
