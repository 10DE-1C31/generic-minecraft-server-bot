const { timeStamp } = require('console');
const { channel } = require('diagnostics_channel');
const { Client, GatewayIntentBits, Message, EmbedBuilder, embedLength } = require(`discord.js`);
require(`dotenv`).config();
const pingModule = import('mc-server-ping');
const fs = require('fs');
const { start } = require('repl');
const configPath = `./config.json`;

const defaultConfig = {
    commandPrefix: "%",
    updateInterval: "10",
    serverAddress: "",
    serverDispName:""
};

let config = { ...defaultConfig };
let channelID = null
let messageID = null

try {
    if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, `utf-8`)
        const parsedData = JSON.parse(data);
        config = { ...defaultConfig, ...parsedData };
    } else {
        console.log(`Config file not found, using defaults...`);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
} catch (err) {
    console.error(`Error loading config, using defaults...`)
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function loadConfig() {
    try {
        const data = fs.readFileSync('./config.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { serverAddress: null };
    }
}

function formatMotd(motd) {
    if (!motd) return 'No MOTD available';
    return motd.replace(/§./g, '');
}
async function pingServer(host) {
    try {
        const { ping } = await pingModule;
        
        const result = await ping(host, { 
            port: 25565, 
            timeout: 5000 
        });

        if (result.online) {
        } else {
            console.log('Pinged server is unreachable');
        };
        
        return result;
    } catch (error) {
        console.error("Failed to fetch server status:", error);
        return { online: false };
    };
}

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`)
    updateLoop();
});

client.login(process.env.DISCORD_TOKEN);

client.on(`messageCreate`, async (Message) => {
    if (Message.author.bot) return
    if (!Message.content.startsWith(`${config.commandPrefix}`)) return

    const args = Message.content.slice(1).trim().split(/ +/)
    const cmd = args.shift()?.toLowerCase();

    if (!cmd) return

   if (cmd === `setip` || cmd === `cfg` || cmd === `resetcfg` || cmd === `startmonitor` || cmd === `stopmonitor`) {
       if (!Message.member.permissions.has(`ManageGuild`))
          return Message.reply(`You need the \`Manage Server\` permission to use this command`)
    }

 if (cmd === 'test') {
        return Message.channel.send(`Test successful :)`);
    }

    if (cmd === 'ping') {
        const serverAddrTemp = args[0]; 
        
        if (!serverAddrTemp) {
            return Message.channel.send(`Server address is not provided.`);
        };

        const status = await pingServer(serverAddrTemp);
        
        if (status.online) {
            const motdFormatted = formatMotd(status.motd);
            let playerListText = 'Hidden or empty';
            
            if (status.players.sample && status.players.sample.length > 0) {
                const names = status.players.sample.map(p => p.name);
                playerListText = names.join(', ');
            };

            return Message.channel.send(`
             **MOTD:** ${motdFormatted}
             **Players:** ${status.players.online}/${status.players.max}
             **Version:** ${status.version.name}
             **Player list:** ${playerListText}
            `);
        } else {
            return Message.channel.send(`Failed to ping server. Is the address \`${serverAddrTemp}\` valid?`);
        };
    }
    
    if (cmd === 'setip') {
        const newAddr = args[0];
        if (!newAddr) return Message.channel.send(`Please enter a server address.`);

        config.serverAddress = newAddr; 
        saveConfig();
        
        return Message.channel.send(`Monitored address set to \`${newAddr}\``);
    }

    if (cmd === 'cfg') {
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('Current Config')
                .setColor(parseInt(config.embedColor) || 0x0060ff)
                .addFields(
                    { name: 'commandPrefix', value: `\`${config.commandPrefix}\``, inline: true },
                    { name: 'updateInterval', value: `\`${config.updateInterval}\``, inline: true },
                    { name: 'serverAddress', value: `\`${config.serverAddress || 'Unset'}\``, inline: true },
                    { name: 'serverDispName', value: `\`${config.serverDispName || `Unset`}\``, inline: true },
                )
                .setFooter({ text: 'Use cfg <key> <value> to change a setting.' });
            
            return Message.channel.send({ embeds: [embed] });
        }

        const key = args[0];
        const value = args.slice(1).join(' ');

        if (!(key in config)) {
            return Message.channel.send(`\`${key}\` is invalid. \n Available keys: \`commandPrefix\` \`updateInterval\` \`serverAddress\` \`serverDispName\``);
        }

        if (!value) {
            return Message.channel.send('Please provide a value. Usage: `cfg <key> <value>`');
        }   

        config[key] = value;
        saveConfig();

        return Message.channel.send(`Set \`${key}\` to \`${value}\`.`);
    }

    if (cmd === `resetcfg`) {
        config = {...defaultConfig};
        saveConfig()
        Message.channel.send(`Config reset to defaults`)
    }

    if (cmd === `startmonitor`) {
        if (!config.serverAddress){
            return Message.channel.send(`Please set a server address with \`setip <address>\``)
        }

        const status = await pingServer(config.serverAddress);
        const embed = buildStatusEmbed(status, config.serverAddress);

        const sentMsg = await Message.channel.send({ embeds: [embed ]});

        channelID = Message.channel.id;
        messageID = sentMsg.id;
    }

    if (cmd === `help`) {
        Message.channel.send(`
            ## Help
            ### Commands
            **Note: You will need to remember the command prefix as it is editable, otherwise you will not be able to access any commands!**
           - \`ping\` <address> 
            Pings the Minecraft server with the specified address
           - \`setip\` <address>
            Sets the server address to be monitored
           - \`cfg\`
            Shows the current configs
           - \`cfg\` <key> <value>
            Changes a value in the config
           - \`resetcfg\`
            Resets the config file to default
           - \`startmonitor\`
            Starts monitoring the address specified with \`setip\` or \`cfg serverAddress\` with a live updating message
           - \`stopmonitor\` 
           Stops monitoring
        `)
    }

    if (cmd === `stopmonitor`) {
        if (!channelID) {
            return channel.message.send(`Monitor is not running`);
        }
        channelID = null;
        messageID = null;
        const noticeMsg = await Message.channel.send(`Monitor stopped`)
        setTimeout(() => noticeMsg.delete().catch(() => {}), 5000)
    }
});

function buildStatusEmbed(status, serverAddress, serverDispName) {
    const timeNow = Math.floor(Date.now() / 1000)
    if (!status.online) {
        return new EmbedBuilder()
        .setTitle(`Address: ${serverAddress}`)
        .setColor(`0xff0000`)
        .setDescription(`Server is unreachable`)
    }

    const motdFormatted = formatMotd(status.motd)
    let playerListText = `-# Unavailable`

    if (status.players.sample && status.players.sample.length > 0) {
        playerListText = status.players.sample.map(p => p.name).join(`, `);
    }

    return new EmbedBuilder()
    .setTitle(`${serverDispName || `Server`} status`)
    .setColor(0x0060ff)
        .setDescription(`**MOTD:**\n${motdFormatted}`)
        .addFields(
            { name: 'Players', value: `${status.players.online}/${status.players.max}`, inline: true },
            { name: 'Version', value: status.version.name, inline: true },
            { name: 'Player List', value: playerListText },
            { name: `Last updated`, value: `<t:${timeNow}:R>`, inline: true}
        )
}

async function updateLoop() {
    if (!channelID || !messageID) {
        setTimeout(updateLoop, 10000);
        return;
    }

    try {
        const channel = await client.channels.fetch(channelID);
        const msg = await channel.messages.fetch(messageID);
        
        const status = await pingServer(config.serverAddress);
        const embed = buildStatusEmbed(status, config.serverAddress, config.serverDispName);
        
        await msg.edit({ embeds: [embed] });
        console.log(`Updated successfully. Waiting ${config.updateInterval}s.`);
    } catch (err) {
        console.log("Error updating message, reattempting..");;
    }

    const intervalSeconds = parseInt(config.updateInterval) || 10;
    setTimeout(updateLoop, intervalSeconds * 1000);
}
