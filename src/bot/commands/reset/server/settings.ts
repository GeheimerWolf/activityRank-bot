import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { subcommand } from 'bot/util/registry/command.js';
import { useConfirm } from 'bot/util/component.js';
import { requireUser } from 'bot/util/predicates.js';
import { ResetGuildSettings } from 'bot/models/resetModel.js';
import { handleResetCommandsCooldown } from 'bot/util/cooldownUtil.js';

export const settings = subcommand({
  data: {
    name: 'settings',
    description: 'Reset all server settings.',
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
    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmButton.instanceId({ predicate }))
        .setLabel('Reset')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(denyButton.instanceId({ predicate }))
        .setLabel('Cancel')
        .setEmoji('❎')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      content: t('reset.server.confirmationSettings'),
      ephemeral: true,
      components: [confirmRow],
    });
  },
});

const { confirmButton, denyButton } = useConfirm({
  async confirmFn({ interaction }) {
    const job = new ResetGuildSettings(interaction.guild);

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
