import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { stripIndent } from 'common-tags';
import guildModel from '../../models/guild/guildModel.js';
import { registerSubCommand } from 'bot/util/commandLoader.js';

registerSubCommand({
  async execute(interaction) {
    if (
      !interaction.member.permissionsIn(interaction.channel!).has(PermissionFlagsBits.ManageGuild)
    ) {
      return await interaction.reply({
        content: 'You need the permission to manage the server in order to use this command.',
        ephemeral: true,
      });
    }

    const items = {
      voteEmote: interaction.options.getString('emote'),
      voteTag: interaction.options.getString('tag'),
    };

    if (Object.values(items).every((x) => x === null)) {
      return await interaction.reply({
        content: 'You must specify at least one option for this command to do anything!',
        ephemeral: true,
      });
    }

    for (const _k in items) {
      const k = _k as keyof typeof items;
      if (items[k] !== null) await guildModel.storage.set(interaction.guild, k, items[k]);
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder().setAuthor({ name: 'Vote Tag/Emote' }).setColor(0x00ae86)
          .setDescription(stripIndent`
        Modified the server's settings!

        Vote Tag: \`${interaction.guild.appData.voteTag}\`
        Vote Emote: ${interaction.guild.appData.voteEmote}
        `),
      ],
      ephemeral: true,
    });
  },
});
