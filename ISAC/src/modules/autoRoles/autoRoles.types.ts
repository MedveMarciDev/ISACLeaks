import EmbedBody from "../../helpers/embedBody";

export type AutoRoleOptions = {
    options: OptionalRole[]
    channel: string
    embed: EmbedBody
    buttonText: string
    menuText: string
};

export type OptionalRole = { name: string, id: string, description: string };