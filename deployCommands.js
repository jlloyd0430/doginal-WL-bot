require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'addrole',
        description: 'Adds a role that can submit wallets',
        options: [
            {
                name: 'role',
                type: 8, // Role type
                description: 'The role to add',
                required: true
            }
        ]
    },
    {
        name: 'wallet',
        description: 'Submit your wallet address',
        options: [
            {
                name: 'address',
                type: 3, // String type
                description: 'Your Doginals wallet address',
                required: true
            }
        ]
    },
    {
        name: 'checkwallet',
        description: 'Check your submitted wallet address'
    },
    {
        name: 'export',
        description: 'Export all submissions to a CSV file'
    },
    {
        name: 'rolelist',
        description: 'List roles allowed to submit wallets'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error deploying commands:', error);
        console.error('Request Body:', error.requestBody);  // Add this line for more detailed error output
    }
})();
