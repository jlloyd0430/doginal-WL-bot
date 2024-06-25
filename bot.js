require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, Partials, Role, AttachmentBuilder } = require('discord.js');
const { MongoClient } = require('mongodb');
const { join } = require('path');
const { writeFileSync } = require('fs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const mongoClient = new MongoClient(process.env.MONGODB_URI);
let db, submissionsCollection;

mongoClient.connect().then(() => {
    db = mongoClient.db('dogewhitelist');
    submissionsCollection = db.collection('submissions');
    console.log('Connected to MongoDB');
});

let allowedRoles = [];

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'addrole') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }

        const role = options.getRole('role');
        if (!allowedRoles.includes(role.id)) {
            allowedRoles.push(role.id);
            await interaction.reply(`Role ${role.name} added to allowed roles.`);
        } else {
            await interaction.reply(`Role ${role.name} is already allowed.`);
        }
    } else if (commandName === 'wallet') {
        const walletAddress = options.getString('address');
        const userId = interaction.user.id;
        const userRoles = interaction.member.roles.cache.map(role => role.id);

        if (!userRoles.some(roleId => allowedRoles.includes(roleId))) {
            await interaction.reply('You do not have the required role to submit a wallet address.');
            return;
        }

        const existingSubmission = await submissionsCollection.findOne({ userId });
        if (existingSubmission) {
            await interaction.reply('You have already submitted a wallet address.');
            return;
        }

        if (walletAddress[0] !== 'D' || walletAddress.length >= 38) {
            await interaction.reply('Invalid wallet address. It must start with "D" and be under 38 characters.');
            return;
        }

        const roleName = interaction.member.roles.cache.find(role => allowedRoles.includes(role.id)).name;
        await submissionsCollection.insertOne({
            userId,
            wallet: walletAddress,
            role: roleName
        });

        await interaction.reply('Wallet address submitted successfully.');
    } else if (commandName === 'checkwallet') {
        const userId = interaction.user.id;
        const submission = await submissionsCollection.findOne({ userId });
        if (submission) {
            await interaction.reply(`Your submitted wallet address is: ${submission.wallet}`);
        } else {
            await interaction.reply('You have not submitted a wallet address.');
        }
    } else if (commandName === 'export') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }

        const submissions = await submissionsCollection.find().toArray();
        const data = submissions.map(submission => ({
            'User ID': submission.userId,
            'Wallet Address': submission.wallet,
            'Role': submission.role
        }));

        const csvContent = `User ID,Wallet Address,Role\n${data.map(row => `${row['User ID']},${row['Wallet Address']},${row['Role']}`).join('\n')}`;
        const filePath = join(__dirname, 'submissions.csv');
        writeFileSync(filePath, csvContent);

        const attachment = new AttachmentBuilder(filePath);
        await interaction.reply({ files: [attachment] });
    } else if (commandName === 'rolelist') {
        const roles = allowedRoles.map(roleId => interaction.guild.roles.cache.get(roleId).name);
        await interaction.reply(`Roles allowed to submit wallets: ${roles.join(', ')}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
