import config from "../configuration";
import { textChannel } from "./common";

export function logRaw(text: string) {
    if (!text)
        return;
    console.error(text);
    const channel = textChannel(config.channels.errorLog);
    channel?.send(text);
}

export default function logError(context: string, error: any) {
    if (error)
        logRaw(`${context}:\n${error.stack || error}\n${config.endOfStackTrace}`);
}
