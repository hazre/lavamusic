import { Command, Context, Lavamusic } from '../../structures/index.js';

export default class Volume extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'volume',
            description: {
                content: 'Sets the volume of the player',
                examples: ['volume 100'],
                usage: 'volume <number>',
            },
            category: 'music',
            aliases: ['vol'],
            cooldown: 3,
            args: true,
            player: {
                voice: false,
                dj: true,
                active: false,
                djPerm: null,
            },
            permissions: {
                dev: false,
                client: ['SendMessages', 'EmbedLinks'],
                user: [],
            },
            slashCommand: true,
            options: [
                {
                    name: 'number',
                    description: 'The volume you want to set',
                    type: 4,
                    required: false,
                },
            ],
        });
    }
    public async run(client: Lavamusic, ctx: Context, args: string[]): Promise<any> {
        const player = client.queue.get(ctx.guild.id);
        const embed = this.client.embed();

        if (args.length === 0) {
            let volume;
            if (player) {
                volume = player.player.volume;
            } else if (client.db.getVolume(ctx.guild.id)) {
                volume = client.db.getVolume(ctx.guild.id);
            } else {
                volume = 'not defined.';
            }
            return await ctx.sendMessage({
                embeds: [
                    embed.setColor(this.client.color.main).setDescription(`Volume is ${volume}`),
                ],
            });
        }

        const number = Number(args[0]);
        if (isNaN(number))
            return await ctx.sendMessage({
                embeds: [
                    embed
                        .setColor(this.client.color.red)
                        .setDescription('Please provide a valid number.'),
                ],
            });
        if (number > 200)
            return await ctx.sendMessage({
                embeds: [
                    embed
                        .setColor(this.client.color.red)
                        .setDescription("The volume can't be higher than 200."),
                ],
            });
        if (number < 0)
            return await ctx.sendMessage({
                embeds: [
                    embed
                        .setColor(this.client.color.red)
                        .setDescription("The volume can't be lower than 0."),
                ],
            });
        if (player) player.player.setGlobalVolume(number);
        client.db.setVolume(ctx.guild.id, number);
        return await ctx.sendMessage({
            embeds: [
                embed
                    .setColor(this.client.color.main)
                    .setDescription(`Set the volume to ${number}`),
            ],
        });
    }
}

/**
 * Project: lavamusic
 * Author: Blacky
 * Company: Coders
 * Copyright (c) 2023. All rights reserved.
 * This code is the property of Coder and may not be reproduced or
 * modified without permission. For more information, contact us at
 * https://discord.gg/ns8CTk9J3e
 */
