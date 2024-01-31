/* eslint-disable @typescript-eslint/typedef */
import { Message, TextChannel, User } from 'discord.js';
import Odesli from 'odesli.js';
import { LoadType, Node, Player, Track } from 'shoukaku';

import { Lavamusic } from './index.js';

export class Song implements Track {
    encoded: string;
    info: {
        identifier: string;
        isSeekable: boolean;
        author: string;
        length: number;
        isStream: boolean;
        position: number;
        title: string;
        uri?: string;
        artworkUrl?: string;
        isrc?: string;
        sourceName: string;
        requester: User;
    };
    pluginInfo: unknown;

    constructor(track: Song | Track, user: User) {
        if (!track) throw new Error('Track is not provided');
        this.encoded = track.encoded;
        this.info = {
            ...track.info,
            requester: user,
        };
    }
}
export default class Dispatcher {
    private client: Lavamusic;
    public guildId: string;
    public channelId: string;
    public player: Player;
    public queue: Song[];
    public stopped: boolean;
    public previous: Song | null;
    public current: Song | null;
    public loop: 'off' | 'repeat' | 'queue';
    public requester: User;
    public repeat: number;
    public node: Node;
    public shuffle: boolean;
    public paused: boolean;
    public filters: Array<string>;
    public autoplay: boolean;
    public nowPlayingMessage: Message | null;
    public history: Song[] = [];

    constructor(options: DispatcherOptions) {
        this.client = options.client;
        this.guildId = options.guildId;
        this.channelId = options.channelId;
        this.player = options.player;
        this.queue = [];
        this.stopped = false;
        this.previous = null;
        this.current = null;
        this.loop = 'off';
        this.repeat = 0;
        this.node = options.node;
        this.shuffle = false;
        this.paused = false;
        this.filters = [];
        this.autoplay = false;
        this.nowPlayingMessage = null;

        this.player
            .on('start', () =>
                this.client.shoukaku.emit('trackStart', this.player, this.current, this)
            )
            .on('end', () => {
                if (!this.queue.length)
                    this.client.shoukaku.emit('queueEnd', this.player, this.current, this);
                this.client.shoukaku.emit('trackEnd', this.player, this.current, this);
            })
            .on('stuck', () => this.client.shoukaku.emit('trackStuck', this.player, this.current))
            .on('closed', (...arr) => {
                this.client.shoukaku.emit('socketClosed', this.player, ...arr);
            });
    }

    get exists(): boolean {
        return this.client.queue.has(this.guildId);
    }
    get volume(): number {
        return this.player.volume;
    }
    public async play(): Promise<void> {
        if (!this.exists || (!this.queue.length && !this.current)) {
            return;
        }
        this.current = this.queue.length !== 0 ? this.queue.shift() : this.queue[0];
        if (!this.current) return;
        this.player.playTrack({ track: this.current?.encoded });
        if (this.current) {
            this.history.push(this.current);
            if (this.history.length > 100) {
                this.history.shift();
            }
        }
    }
    public pause(): void {
        if (!this.player) return;
        if (!this.paused) {
            this.player.setPaused(true);
            this.paused = true;
        } else {
            this.player.setPaused(false);
            this.paused = false;
        }
    }
    public remove(index: number): void {
        if (!this.player) return;
        if (index > this.queue.length) return;
        this.queue.splice(index, 1);
    }
    public previousTrack(): void {
        if (!this.player) return;
        if (!this.previous) return;
        this.queue.unshift(this.previous);
        this.player.stopTrack();
    }
    public destroy(): void {
        this.queue.length = 0;
        this.history = [];
        this.client.shoukaku.leaveVoiceChannel(this.guildId);
        this.client.queue.delete(this.guildId);
        if (this.stopped) return;
        this.client.shoukaku.emit('playerDestroy', this.player);
    }

    public safeDestroy(): void {
        if (this.queue.length > 0) return;
        const data = this.client.db.get_247(this.player.guildId);
        if (data) return;
        this.destroy();
    }
    public setShuffle(shuffle: boolean): void {
        if (!this.player) return;
        this.shuffle = shuffle;
        if (shuffle) {
            const current = this.queue.shift();
            this.queue = this.queue.sort(() => Math.random() - 0.5);
            this.queue.unshift(current);
        } else {
            const current = this.queue.shift();
            this.queue = this.queue.sort((a: any, b: any) => a - b);
            this.queue.unshift(current);
        }
    }
    public async skip(skipto = 1): Promise<void> {
        if (!this.player) return;
        if (skipto > 1) {
            if (skipto > this.queue.length) {
                this.queue.length = 0;
            } else {
                this.queue.splice(0, skipto - 1);
            }
        }
        this.repeat = this.repeat == 1 ? 0 : this.repeat;
        this.player.stopTrack();
    }
    public seek(time: number): void {
        if (!this.player) return;
        this.player.seekTo(time);
    }
    public stop(): void {
        if (!this.player) return;
        this.queue.length = 0;
        this.history = [];
        this.loop = 'off';
        this.autoplay = false;
        this.repeat = 0;
        this.stopped = true;
        this.player.stopTrack();
    }
    public setLoop(loop: any): void {
        this.loop = loop;
    }

    public buildTrack(track: Song | Track, user: User): Song {
        return new Song(track, user);
    }
    public async isPlaying(): Promise<void> {
        if (this.queue.length && !this.current && !this.player.paused) {
            this.play();
        }
    }
    public async Autoplay(song: Song): Promise<void> {
        if (this.queue.length > 0) return;
        this.client.logger.debug(this.queue);
        let identifier = song.info.identifier;
        if (!song.info.sourceName.includes('youtube')) {
            if (!song.info.uri) return this.safeDestroy();

            const odesli = new Odesli();
            let result = await odesli.fetch(song.info.uri);
            if (!result) return;
            if (!result.linksByPlatform.youtube.url) return this.safeDestroy();

            const resolve = await this.node.rest.resolve(result.linksByPlatform.youtube.url);
            if (!resolve || !resolve?.data || resolve.loadType !== LoadType.TRACK) {
                return this.safeDestroy();
            }

            identifier = resolve.data.info.identifier;
        }

        const mixPlaylist = new URL(
            `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}&start_radio=1`
        );
        const resolve = await this.node.rest.resolve(mixPlaylist.href);

        if (!resolve || !resolve?.data || resolve.loadType !== LoadType.PLAYLIST)
            return this.safeDestroy();

        const metadata = resolve.data.tracks.filter(track => track.info.identifier !== identifier);

        for (const item of metadata) {
            const potentialChoice = this.buildTrack(item, this.client.user);

            const isInQueue = this.queue.some(
                s => s.info.identifier === potentialChoice.info.identifier
            );
            const isInHistory = this.history.some(
                s => s.info.identifier === potentialChoice.info.identifier
            );
            if (isInQueue || isInHistory) {
                continue;
            }

            this.queue.push(potentialChoice);
        }

        try {
            const guild = this.client.guilds.cache.get(this.player.guildId);
            const channel = guild.channels.cache.get(this.channelId) as TextChannel;
            const embed = this.client.embed();

            channel.send({
                embeds: [
                    embed
                        .setColor(this.client.color.main)
                        .setDescription(`Added ${this.queue.length} songs to the queue.`),
                ],
            });
        } catch (err) {
            throw new Error(`Couldn't send Autoplay Embed`);
        }

        return await this.isPlaying();
    }
    public async setAutoplay(autoplay: boolean): Promise<void> {
        this.autoplay = autoplay;
        // if (autoplay) {
        //     this.Autoplay(this.current ? this.current : this.queue[0]);
        // }
    }
}

export interface DispatcherOptions {
    client: Lavamusic;
    guildId: string;
    channelId: string;
    player: Player;
    node: Node;
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
