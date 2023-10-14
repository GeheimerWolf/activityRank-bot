import { registerEvent } from 'bot/util/eventLoader.js';
import { Events } from 'discord.js';
import guildModel from '../models/guild/guildModel.js';
import guildMemberModel from '../models/guild/guildMemberModel.js';

registerEvent(Events.VoiceStateUpdate, async function (oldState, newState) {
  const member = oldState.member;
  if (!member || !member.user || member.user.bot) return;

  await guildModel.cache.load(oldState.guild);
  await guildMemberModel.cache.load(member);

  if (oldState.channel === null && newState.channel !== null && newState.member !== null) {
    // Join
  } else if (newState.channel === null && oldState.channel !== null && oldState.member !== null) {
    // Leave
  } else {
    // Switch or mute
  }
});
