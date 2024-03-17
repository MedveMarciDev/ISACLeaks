import CommandBase from "./commandBase";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, userMention } from "discord.js";
import { command, options } from "./decorators";
import { getAllIssuedBy } from "../modules/sanctionSystem/sanctionManager";
import { createSanctionEmbed } from "../modules/sanctionSystem/embedHelpers";
import logError from "../helpers/errorLogger";

@command("listissued", "Felhasználó által feljegyzett szankciók lekérése")
@options({
        name: "user",
        type: ApplicationCommandOptionType.User,
        description: "Discord felhasználó",
        required: false
    },
    {
        name: "id",
        type: ApplicationCommandOptionType.String,
        description: "DiscordID",
        required: false
    })
export default class ListIssued extends CommandBase {
    protected async executeInternal(command: ChatInputCommandInteraction): Promise<void> {
        const user = this.userOption("user", true)?.id ?? this.optStr("id");
        if (!user) {
            await command.reply("Nem található a felhasználó! Válassz ki egy felhasználót vagy adj meg egy ID-t!");
            return;
        }
        const sanctions = getAllIssuedBy(user);
        if (sanctions.length === 0) {
            await command.reply({
                content: `${(userMention(user))} még nem jegyzett fel szankciót.`,
                allowedMentions: { users: [] },
                ephemeral: true
            });
            return;
        }
        const embeds = sanctions.map(e => createSanctionEmbed(e, true));
        let replied = false;
        try {
            await command.reply({
                content: `${(userMention(user))} által feljegyzett szankciók:`,
                embeds: embeds.slice(0, 10),
                allowedMentions: { users: [] },
                ephemeral: true
            });
            replied = true;
            if (embeds.length > 10)
                for (let i = 10; i < embeds.length; i += 10)
                    await command.followUp({
                        embeds: embeds.slice(i, i + 10),
                        ephemeral: true
                    });
            await command.followUp({ content: `Összesen ${sanctions.length} feljegyzés`, ephemeral: true });
        } catch (e) {
            logError("Failed to send full sanction list:", e);
            await (replied ? command.editReply : command.reply)("Nem sikerült a teljes lista megjelenítése.");
        }
    }

};