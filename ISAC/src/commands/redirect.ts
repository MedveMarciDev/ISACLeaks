import CommandBase from "./commandBase";
import { command, options } from "./decorators";
import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    channelMention,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    TextChannel
} from "discord.js";
import config from "../configuration";
import { executedCommandInteractions, stripUid } from "../modules/tickets/ticketManager";
import { getVanillaEmojiComponent } from "../helpers/emojiResolver";
import { TicketInteraction } from "../modules/tickets/tickets.types";

@command("redirect", "A ticketbe üzenetet küld, hogy a megfelelő jegyhez irányítsa a felhasználót")
@options({
    name: "target",
    type: ApplicationCommandOptionType.String,
    description: "A cél csatorna neve",
    required: true,
    choices: config.tickets.filter(e => !e.tempDisable).map(e => ({
        name: e.creation.embed.title,
        value: e.id
    }))
})
export default class Redirect extends CommandBase {
    protected async executeInternal(command: ChatInputCommandInteraction): Promise<void> {
        const channel = <TextChannel>command.channel;
        const stripped = stripUid(channel.name);
        const current = config.tickets.find(i => i.channelName === stripped);
        if (current == null) {
            await this.replyEphemeral("Ez nem egy ticket!");
            return;
        }
        const selected = this.str("target");
        const target = config.tickets.find(e => e.id === selected);
        if (!target) {
            await this.replyEphemeral(`Nincs ilyen ticket: "${selected}"!`);
            return;
        }

        if (target === current) {
            await this.replyEphemeral("Nem irányíthatod át a felhasználót a jelenlegi ticket típusba!");
            return;
        }

        const guild = command.guild!.id;
        await channel.permissionOverwrites.set(
            [
                ...channel.permissionOverwrites.cache.filter(e => e.id !== guild).map(e => ({
                    id: e.id,
                    allow: e.allow.remove(PermissionFlagsBits.SendMessages),
                    deny: e.allow.add(PermissionFlagsBits.SendMessages)
                })),
                {
                    id: guild,
                    deny: [ PermissionFlagsBits.ViewChannel ]
                }
            ]
        );
        const targetName = target.initialization.embed.title;
        await command.reply({
            content: `## A jelenlegi problémáddal kapcsolatban ebben a jegyben nem tudunk segíteni
A jelenlegi ticket (\`${current.creation.embed.title}\`) célja: \`${current.creation.description}\`

## Kérünk, ha a mostani panaszodhoz hasonló probléma adódik, nyiss ${channelMention(target.initialization.channel)} jegyet!
A \`${target.creation.embed.title}\` ticket célja: \`${target.creation.description}\``,
            components: [ new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                .setEmoji(getVanillaEmojiComponent("locked")!)
                .setCustomId(TicketInteraction.Close)
                .setStyle(ButtonStyle.Danger)
                .setLabel("Jegy Lezárása")
            ) ]
        });
        executedCommandInteractions.set(command.id, `redirect ${targetName}`);
    }

}