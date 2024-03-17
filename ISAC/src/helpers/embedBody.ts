import { ColorResolvable } from "discord.js";

export default interface EmbedBody {
    title: string,
    body: string,
    color: ColorResolvable,
}