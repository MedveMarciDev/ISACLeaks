import client from "../modules/client";
import CommandList from "../commands/commandList";

client.once("ready", async () => {
    console.log("Updating commands...");
    await CommandList.registerCommands();
    console.log("Operation completed.");
    process.exit(0);
});

require("dotenv").config();

client.login(process.env.BOT_TOKEN).then(() => console.log("Authentication successful."));

console.log("Logging in...");
