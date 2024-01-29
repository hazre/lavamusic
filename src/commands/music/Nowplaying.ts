import { AttachmentBuilder } from 'discord.js';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import createCard from 'songcard';

import { Command, Context, Lavamusic } from '../../structures/index.js';

export default class Nowplaying extends Command {
    constructor(client: Lavamusic) {
        super(client, {
            name: 'nowplaying',
            description: {
                content: 'Shows the currently playing song',
                examples: ['nowplaying'],
                usage: 'nowplaying',
            },
            category: 'music',
            aliases: ['np'],
            cooldown: 3,
            args: false,
            player: {
                voice: true,
                dj: false,
                active: true,
                djPerm: null,
            },
            permissions: {
                dev: false,
                client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
                user: [],
            },
            slashCommand: true,
            options: [],
        });
    }
    public async run(client: Lavamusic, ctx: Context): Promise<any> {
        const player = client.queue.get(ctx.guild.id);
        const track = player.current;

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const noBgURL = path.join(__dirname, '..', '..', 'assets', 'no_bg.png');
        const cardImage = await createCard(track.info.artworkUrl || noBgURL, track.info.title, track.info.isStream, player.player.position, track.info.length);
        const attachment = new AttachmentBuilder(cardImage, { name: 'card.png' });

        const embed1 = this.client
            .embed()
            .setAuthor({
                name: 'Now Playing',
                iconURL:
                    this.client.config.icons[track.info.sourceName] ??
                    this.client.user.displayAvatarURL({ extension: 'png' }),
            })
            .setColor(this.client.color.main)
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .setFooter({
                text: `Requested by ${track.info.requester.tag}`,
                iconURL: track.info.requester.avatarURL({}),
            })
            .addFields(
                { name: 'Author', value: track.info.author, inline: true }
            )
            .setImage('attachment://card.png')
            .setTimestamp();
        return await ctx.sendMessage({ embeds: [embed1], files: [attachment] });
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
