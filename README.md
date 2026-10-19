# Generic Minecraft Server Bot
A simple Discord bot to ping Minecraft servers and monitor their status

## Features
### One time server ping (`ping`)
- Pings the address specified, and returns stats like player count, player list and MOTD
- Usage: `ping <address>`
### Live monitor
- Pings the address specified with `setip` on a set interval
- Usage: `setip <address>` then `startmonitor`
### Many configurable options
- Command prefix `commandPrefix`
- Monitor update interval `updateInterval`
- Monitored server address `serverAddress`
- Monitor server display name `serverDispName`

## Commands
### `test`
Tests if the bot is receiving and sending messages properly, returns `Test successful :)` if bot is set up properly.
### `ping <address>`
Pings the specified address and returns information
### `setip <address>`
Sets the server address to monitor (needs manage server permissions in Discord)
### `cfg`
Shows the current configuration
### `cfg <key> <value>`
Changes a value in the configuration
### `resetcfg`
Resets the config file to default settings
### `startmonitor`
Starts monitoring the saved server address
### `stopmonitor`
Stops updating the status of the saved server address


## Installation
1. Clone the repository
2. Run `npm install` to install dependencies
3. Register the bot with Discord 
   https://discord.com/developers
4.  Create a file named `.env` with `DISCORD_TOKEN=` followed by the token you got from Discord Developer Portal
5. Open your terminal in the cloned repo folder
6. Run the bot with `node index.js`
7. Set up a systemd service if you want the bot to autostart 
