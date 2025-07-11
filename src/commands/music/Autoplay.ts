import { Command, type Context, type Lavamusic } from "../../structures/index";

export default class Autoplay extends Command {
  constructor(client: Lavamusic) {
    super(client, {
      name: "autoplay",
      description: {
        content: "cmd.autoplay.description",
        examples: ["autoplay"],
        usage: "autoplay",
      },
      category: "music",
      aliases: ["ap"],
      cooldown: 3,
      args: false,
      vote: true,
      player: {
        voice: true,
        dj: true,
        active: true,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: [
          "SendMessages",
          "ReadMessageHistory",
          "ViewChannel",
          "EmbedLinks",
        ],
        user: [],
      },
      slashCommand: true,
      options: [],
    });
  }

  public async run(client: Lavamusic, ctx: Context): Promise<any> {
    const player = client.manager.getPlayer(ctx.guild!.id);
    if (!player) {
      return await ctx.sendMessage({
        embeds: [
          {
            description: ctx.locale("player.errors.no_player"),
            color: this.client.color.red,
          },
        ],
      });
    }

    const embed = this.client.embed();
    const autoplay = player.get<boolean>("autoplay");

    player.set("autoplay", !autoplay);

    if (autoplay) {
      embed
        .setDescription(ctx.locale("cmd.autoplay.messages.disabled"))
        .setColor(this.client.color.main);
    } else {
      embed
        .setDescription(ctx.locale("cmd.autoplay.messages.enabled"))
        .setColor(this.client.color.main);
    }

    await ctx.sendMessage({ embeds: [embed] });
  }
}

/**
 * Project: lavamusic
 * Author: Appu
 * Main Contributor: LucasB25
 * Company: Coders
 * Copyright (c) 2024. All rights reserved.
 * This code is the property of Coder and may not be reproduced or
 * modified without permission. For more information, contact us at
 * https://discord.gg/YQsGbTwPBx
 */
