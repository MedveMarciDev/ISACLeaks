import { IFieldParser } from "./parsers.baseTypes";
import config from "../../../configuration";
import { Server } from "../../serverStatus/status.types";

export default class ServerListParser implements IFieldParser<Server[]> {
    public static instance = new ServerListParser();

    names: string[] = [ "Szerver", "Server", "Szerverek", "Servers" ];

    parse(value: string): Server[] | null {
        if (!value)
            return null;
        const found = new Set<Server>();
        for (const association of config.serverStatus.associations)
            if (value.includes(association.role))
                found.add(<Server>association.server);

        for (const server of Object.values(Server)) {
            const num = server.trim().split("-")[0];
            if (num.length > 0 && value.includes(num))
                found.add(<Server>server);
        }
        return found.size === 0 ? null : Array.from(found);
    }

};