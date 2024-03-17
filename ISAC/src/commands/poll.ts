import CommandBase from "./commandBase";
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    EmbedBuilder
} from "discord.js";
import { newEmbed } from "../helpers/common";
import { command, options } from "./decorators";

@command("poll", "Szavazás")
@options({
        name: "title",
        type: ApplicationCommandOptionType.String,
        description: "A szavazás címe.",
        required: true
    },
    {
        name: "option_one_message",
        type: ApplicationCommandOptionType.String,
        description: "Az első opció üzenete.",
        required: true
    },
    {
        name: "option_one_reaction",
        type: ApplicationCommandOptionType.String,
        description: "Az első opció emojija.",
        required: true
    },
    {
        name: "option_two_message",
        type: ApplicationCommandOptionType.String,
        description: "A második opció üzenete.",
        required: true
    },
    {
        name: "option_two_reaction",
        type: ApplicationCommandOptionType.String,
        description: "A második opció emoji",
        required: true
    })
export default class Poll extends CommandBase {
    commandName = "poll";
    description = "Szavazat";

    async executeInternal(command: ChatInputCommandInteraction) {
        const o = command.options;
        const optionOne = PollOption.parse(o.getString("option_one_message"), o.getString("option_one_reaction"));
        const optionTwo = PollOption.parse(o.getString("option_two_message"), o.getString("option_two_reaction"));
        if (optionOne.reaction == null) {
            await this.replyEphemeral("Első emoji nem található!");
            return;
        }
        if (optionTwo.reaction == null) {
            await this.replyEphemeral("Második emoji nem található!");
            return;
        }
        const title = newEmbed()
        .setTitle("**Szavazás**")
        .setDescription(o.getString("title") ?? "Hiányzó cím!")
        .setColor("#c800ff");
        const embedOne = new EmbedBuilder()
        .setTitle(optionOne.reaction)
        // @ts-ignore
        .setDescription(optionOne.messageContent)
        .setColor("#32ff32");
        const embedTwo = new EmbedBuilder()
        .setTitle(optionTwo.reaction)
        // @ts-ignore
        .setDescription(optionTwo.messageContent)
        .setColor("#ff3232");
        await this.replyEphemeral("Küldés...");
        command.channel?.send({ embeds: [ title, embedOne, embedTwo ] }).then(m =>
            m.react(optionOne.reaction!)
            .catch(() => {
                console.log("Nem sikerült reagálni!");
                if (!m.deletable)
                    m.delete();
                command.editReply({ content: "Első reakció nem létezik!" });
            })
            .then(() => m.react(optionTwo.reaction!))
            .catch(() => {
                console.log("Nem sikerült reagálni!");
                if (!m.deletable)
                    m.delete();
                command.editReply({ content: "Második reakció nem létezik!" });
            }));
    }

}

class PollOption {

    static regex: RegExp = /:?([^:]+):?/;

    static parse(message: string | null, reaction: string | null): PollOption {
        throw new Error("Method not implemented.");
        /*console.log(reaction);
        const replaced = EmojiFetcher.getServerEmojiOrDefault((reaction ?? "hiányzó reakció").replace(this.regex, "$1"));
        const emoji = replaced as Emoji;
        const pollOption = new PollOption(message ?? "Hiányzó opció", emoji == null ? replaced as string : `:${emoji.id}:`);
        console.log(pollOption.reaction);
        return pollOption;*/
    }

    constructor(message: string, reaction: string | null) {
        this.reaction = reaction;
        this.message = message;
    }

    reaction: string | null;
    message: string;
}
