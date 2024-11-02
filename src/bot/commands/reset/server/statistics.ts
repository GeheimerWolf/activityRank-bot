import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
} from 'discord.js';
import { subcommand } from 'bot/util/registry/command.js';
import { actionrow, useConfirm } from 'bot/util/component.js';
import { requireUser } from 'bot/util/predicates.js';
import { ResetGuildStatistics } from 'bot/models/resetModel.js';
import { handleResetCommandsCooldown } from 'bot/util/cooldownUtil.js';
import { component } from 'bot/util/registry/component.js';
import { commaListsAnd } from 'common-tags';

type Table = 'textMessage' | 'voiceMinute' | 'vote' | 'invite' | 'bonus';

export const statistics = subcommand({
  data: {
    name: 'statistics',
    description: 'Reset one or more types of statistic for the entire server.',
    type: ApplicationCommandOptionType.Subcommand,
  },
  async execute({ interaction }) {
    if (
      !interaction.member.permissionsIn(interaction.channel!).has(PermissionFlagsBits.ManageGuild)
    ) {
      await interaction.reply({
        content: t('reset.server.missingManage'),
        ephemeral: true,
      });
      return;
    }

    if ((await handleResetCommandsCooldown(interaction)).denied) return;

    const predicate = requireUser(interaction.user);

    const typesRow = actionrow([
      {
        type: ComponentType.StringSelect,
        customId: xpTypeselect.instanceId({ predicate }),
        options: [
          {
            label: t('reset.server.messages'),
            value: 'textMessage',
            emoji: '✍️',
          },
          {
            label: t('reset.server.voicetime'),
            value: 'voiceMinute',
            emoji: '🎙️',
          },
          {
            label: t('reset.server.votes'),
            value: 'vote',
            // TODO: emoji: cachedGuild.db.voteEmote,
            emoji: '❤️',
          },
          {
            label: t('reset.server.invites'),
            value: 'invite',
            emoji: '✉️',
          },
          {
            label: t('reset.server.bonus'),
            value: 'bonus',
            emoji: '⭐',
          },
        ] satisfies { value: Table; [k: string]: unknown }[],
        maxValues: 5,
        minValues: 1,
        placeholder: 'Select XP types to reset.',
      },
    ]);

    await interaction.reply({
      content: t('reset.server.type'),
      ephemeral: true,
      components: [typesRow],
    });
  },
});

const xpTypeselect = component({
  type: ComponentType.StringSelect,
  async callback({ interaction }) {
    const predicate = requireUser(interaction.user);
    const values = interaction.values as Table[];

    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmButton.instanceId({ predicate, data: { tables: values } }))
        .setLabel(t('reset.server.reset'))
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(denyButton.instanceId({ predicate }))
        .setLabel(t('reset.server.cancel'))
        .setEmoji('❎')
        .setStyle(ButtonStyle.Secondary),
    );

    const prettify: Record<string, string> = {
      textMessage: 'text',
      voiceMinute: 'voice',
      vote: 'vote',
      invite: 'invite',
      bonus: 'bonus',
    };
      //WOLF - reset.server.explanation
    const xpAssociatedMessage = values.includes('bonus')
      ? values.length > 1
        ? 'XP granted via bonus will be reset, but no other statistics will reset XP. You may be looking for `/reset server xp`.'
        : 'Since you are resetting the bonus statistic, this **will impact** the XP of any users that have bonus XP.'
      : 'XP associated with those statistics will not be reset - try `/reset server xp`!';

      //WOLF - reset.server.confirmationStats
    await interaction.reply({
      content: commaListsAnd`Are you sure you want to reset all the **${values.map((v) => prettify[v])}** statistics?\n\n${xpAssociatedMessage} **This cannot be undone.**`,
      ephemeral: true,
      components: [confirmRow],
    });
  },
});

const { confirmButton, denyButton } = useConfirm<{ tables: Table[] }>({
  async confirmFn({ interaction, data }) {
    const job = new ResetGuildStatistics(interaction.guild, data.tables);

    await interaction.update({ content: t('reset.preparing'), components: [] });

    await job.plan();
    await job.logStatus(interaction);

    await job.runUntilComplete({
      onPause: async () => await job.logStatus(interaction),
      globalBufferTime: 100,
      jobBufferTime: 2000,
    });
    await job.logStatus(interaction);
  },
  async denyFn({ interaction }) {
    await interaction.update({ components: [], content: t('reset.cancelled') });
  },
});
