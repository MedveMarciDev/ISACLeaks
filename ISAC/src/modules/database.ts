import { PrismaClient } from "@prisma/client";

class Database {

    con!: PrismaClient;

    constructor() {
        this.con = new PrismaClient();
    }

    async connect() {
        console.log("Connecting to database...");
        await this.con.$connect();
    }

    async create() {
        await this.connect();
        console.log("Creating database: mutes");
        await this.execute(
            `CREATE TABLE IF NOT EXISTS mutes (
                user VARCHAR(32) NOT NULL,
                mutedBy VARCHAR(32) NOT NULL,
                expires VARCHAR(32) NOT NULL,
                messageContent text NOT NULL,
                embed tinytext NOT NULL
            )`);
        console.log("Mutes created!");
        console.log("Creating database: ticketLog");
        await this.execute(
            `CREATE TABLE IF NOT EXISTS ticketLog (
                id INT NOT NULL AUTO_INCREMENT,
                log LONGTEXT NOT NULL,
                PRIMARY KEY (id)
            );`
        );
        console.log("Ticket log created!");
        console.log("Creating database: bans");
        await this.execute(
            `CREATE TABLE IF NOT EXISTS bans (
                banId INT NOT NULL AUTO_INCREMENT,
                steamId VARCHAR(32) NOT NULL,
                nickname VARCHAR(32) NOT NULL,
                IP VARCHAR(32) NOT NULL,
                bannedBy VARCHAR(32) NOT NULL,
                created VARCHAR(32) NOT NULL,
                duration INT NOT NULL,
                servers VARCHAR(128) NOT NULL,
                reason text NOT NULL,
                PRIMARY KEY (banId)
            )`);
        console.log("Bans created!");
        console.log("Creating database: warnings");
        await this.execute(
            `CREATE TABLE IF NOT EXISTS warnings (
                warnId INT NOT NULL AUTO_INCREMENT,
                steamId VARCHAR(32) NOT NULL,
                nickname VARCHAR(32) NOT NULL,
                IP VARCHAR(32) NOT NULL,
                warnedBy VARCHAR(32) NOT NULL,
                created VARCHAR(32) NOT NULL,
                servers VARCHAR(128) NOT NULL,
                reason text NOT NULL,
                PRIMARY KEY (warnId)
            )`);
        console.log("Warnings created!");
        console.log("Creating database: ageChecks");
        await this.execute(
            `CREATE TABLE IF NOT EXISTS ageChecks (
                checkId INT NOT NULL AUTO_INCREMENT,
                apparentDateOfBirth VARCHAR(32) NOT NULL,
                steamId VARCHAR(32) NOT NULL,
                nickname VARCHAR(32) NOT NULL,
                checkedBy VARCHAR(32) NOT NULL,
                created VARCHAR(32) NOT NULL,
                PRIMARY KEY (checkId)
            )`);
        console.log("Age checks created!");
        console.log("Creating database: wantedIndividuals");
        await this.execute(
            `CREATE TABLE IF NOT EXISTS wantedIndividuals (
                entryId INT NOT NULL AUTO_INCREMENT,
                issuer VARCHAR(32) NOT NULL,
                nickname VARCHAR(32) NOT NULL,
                servers VARCHAR(128) NOT NULL,
                reason text NOT NULL,
                created VARCHAR(32) NOT NULL,
                PRIMARY KEY (entryId)
            )`);
        console.log("Operation completed.");
    }

    public execute(sql: string) {
        return this.con.$executeRawUnsafe(sql);
    }
}

const db = new Database();

export default db;